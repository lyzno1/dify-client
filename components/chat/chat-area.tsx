'use client';

import * as React from 'react';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/app-store';
import { difyApi } from '@/lib/api/dify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, StopCircle, User, Bot } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThinkBlock } from './think-block';
import { parseThinkTags } from '@/lib/utils/think-parser';

export function ChatArea() {
    const { apps, currentAppId, currentConversationId, setCurrentConversation, userId } = useAppStore();
    const queryClient = useQueryClient();
    const currentApp = apps.find((app) => app.id === currentAppId);

    const [input, setInput] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const [streamingMessage, setStreamingMessage] = React.useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const {
        data: historyData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['messages', currentConversationId],
        queryFn: async ({ pageParam }) => {
            if (!currentApp || !currentConversationId) return { data: [], has_more: false, limit: 20 };
            return difyApi.getMessages(currentApp, currentConversationId, userId, pageParam);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.has_more && lastPage.data.length > 0) {
                return lastPage.data[lastPage.data.length - 1]?.id;
            }
            return undefined;
        },
        enabled: !!currentApp && !!currentConversationId,
    });

    const messages = React.useMemo(() => {
        if (!historyData) return [];
        const allMessages = historyData.pages.flatMap((page) => page.data);
        return allMessages.sort((a, b) => a.created_at - b.created_at);
    }, [historyData]);

    // Scroll management
    const [autoScroll, setAutoScroll] = React.useState(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }

        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    React.useEffect(() => {
        if (scrollRef.current && autoScroll) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingMessage, autoScroll]);

    const [lastQuery, setLastQuery] = React.useState('');

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !currentApp || isSending) return;

        const query = input;
        setLastQuery(query);
        setInput('');
        setIsSending(true);
        setStreamingMessage('');

        // Immediate scroll to bottom
        setTimeout(scrollToBottom, 0);

        abortControllerRef.current = new AbortController();

        try {
            const response = await difyApi.sendMessage(currentApp, {
                query,
                inputs: {},
                response_mode: 'streaming',
                user: userId,
                conversation_id: currentConversationId || undefined,
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let loop = true;
            let buffer = '';

            while (loop) {
                const { done, value } = await reader.read();
                if (done) {
                    loop = false;
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine.startsWith('data: ')) continue;

                    const jsonStr = trimmedLine.slice(6);
                    if (jsonStr === '[DONE]') {
                        loop = false;
                        break;
                    }

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.event === 'message' || data.event === 'agent_message') {
                            setStreamingMessage((prev) => prev + data.answer);
                        } else if (data.event === 'message_end') {
                            if (data.conversation_id && !currentConversationId) {
                                setCurrentConversation(data.conversation_id);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Send message error:', error);
        } finally {
            setIsSending(false);
            setStreamingMessage('');
            setLastQuery('');
            abortControllerRef.current = null;
            queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations', currentAppId] });
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsSending(false);
            setLastQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!currentApp) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="p-4 rounded-full bg-muted/50">
                    <Bot className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium">Select an app to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 md:p-6 space-y-8"
                    onScroll={handleScroll}
                >
                    {hasNextPage && (
                        <div className="flex justify-center py-4">
                            {isFetchingNextPage ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} className="text-muted-foreground hover:text-foreground">
                                    Load previous messages
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Inside ChatArea component */}

                    {messages.map((msg) => (
                        <div key={msg.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* User Message */}
                            <div className="flex justify-end gap-3">
                                <div className="flex flex-col items-end max-w-[80%] md:max-w-[70%]">
                                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.query}</p>
                                    </div>
                                </div>
                                <Avatar className="h-8 w-8 mt-1 border">
                                    <AvatarFallback className="bg-primary/10 text-primary"><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                            </div>

                            {/* AI Message */}
                            <div className="flex justify-start gap-3">
                                <Avatar className="h-8 w-8 mt-1 border bg-muted/50">
                                    <AvatarFallback><Bot className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start max-w-[85%] md:max-w-[75%] w-full">
                                    <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-6 py-4 shadow-sm w-full overflow-hidden">
                                        {parseThinkTags(msg.answer).map((part, index) => (
                                            part.type === 'think' ? (
                                                <ThinkBlock
                                                    key={index}
                                                    content={part.content}
                                                    isStreaming={false}
                                                />
                                            ) : (
                                                <Streamdown
                                                    key={index}
                                                    className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50"
                                                >
                                                    {part.content}
                                                </Streamdown>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Optimistic User Message */}
                            <div className="flex justify-end gap-3">
                                <div className="flex flex-col items-end max-w-[80%] md:max-w-[70%]">
                                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed">{lastQuery}</p>
                                    </div>
                                </div>
                                <Avatar className="h-8 w-8 mt-1 border">
                                    <AvatarFallback className="bg-primary/10 text-primary"><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Streaming AI Message */}
                            <div className="flex justify-start gap-3">
                                <Avatar className="h-8 w-8 mt-1 border bg-muted/50">
                                    <AvatarFallback><Bot className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start max-w-[85%] md:max-w-[75%] w-full">
                                    <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-6 py-4 shadow-sm w-full overflow-hidden min-h-[60px]">
                                        {streamingMessage ? (
                                            parseThinkTags(streamingMessage).map((part, index) => (
                                                part.type === 'think' ? (
                                                    <ThinkBlock
                                                        key={index}
                                                        content={part.content}
                                                        isStreaming={!part.closed}
                                                    />
                                                ) : (
                                                    <Streamdown
                                                        key={index}
                                                        className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50"
                                                    >
                                                        {part.content}
                                                    </Streamdown>
                                                )
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-1 h-6">
                                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 md:p-6 border-t bg-background/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[60px] max-h-[200px] resize-none pr-12 py-4 px-5 rounded-2xl border-muted-foreground/20 focus:border-primary/50 shadow-sm bg-background"
                    />
                    <div className="absolute right-3 bottom-3">
                        {isSending ? (
                            <Button
                                size="icon"
                                variant="destructive"
                                onClick={handleStop}
                                className="h-9 w-9 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                                <StopCircle className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim() || isSending}
                                className={cn(
                                    "h-9 w-9 rounded-xl shadow-sm transition-all",
                                    input.trim() ? "hover:shadow-md hover:scale-105" : "opacity-50"
                                )}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div className="text-center mt-2">
                    <p className="text-xs text-muted-foreground/50">
                        AI can make mistakes. Check important info.
                    </p>
                </div>
            </div>
        </div>
    );
}
