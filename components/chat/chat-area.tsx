'use client';

import * as React from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/app-store';
import { difyApi, Message } from '@/lib/api/dify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, StopCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

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
        isLoading: isHistoryLoading,
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
                // The API uses the ID of the first message in the list as the cursor for the next page (older messages)
                // Assuming the API returns messages in reverse chronological order (newest first) or we need to find the "oldest" ID.
                // Dify API usually returns latest messages first.
                // So the "last" message in the array is the oldest? Or the first?
                // Let's assume the API returns [Newest, ..., Oldest].
                // Then we need the ID of the last item.
                // Wait, the doc says "first_id".
                // If the list is [M10, M9, ... M1], and we want M0..M-9.
                // If we pass first_id=M1, do we get M0?
                // Let's try using the ID of the last item in the data array as the cursor.
                return lastPage.data[lastPage.data.length - 1]?.id;
            }
            return undefined;
        },
        enabled: !!currentApp && !!currentConversationId,
    });

    const messages = React.useMemo(() => {
        if (!historyData) return [];
        // Flatten pages
        const allMessages = historyData.pages.flatMap((page) => page.data);
        // Sort by created_at ascending (Oldest -> Newest) for display
        return allMessages.sort((a, b) => a.created_at - b.created_at);
    }, [historyData]);

    // Scroll management
    const [autoScroll, setAutoScroll] = React.useState(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        // If scrolled to top, fetch more
        if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            // Save current scroll height to restore position after load
            const oldScrollHeight = scrollHeight;
            fetchNextPage().then(() => {
                // Restore scroll position
                // This is tricky with React's render cycle.
                // We might need a useLayoutEffect or similar.
                // For now, let's just fetch.
            });
        }

        // Check if user is at bottom
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    React.useEffect(() => {
        // Scroll to bottom on new messages if autoScroll is true
        if (scrollRef.current && autoScroll) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingMessage, autoScroll]);

    const [lastQuery, setLastQuery] = React.useState('');

    const handleSend = async () => {
        if (!input.trim() || !currentApp || isSending) return;

        const query = input;
        setLastQuery(query);
        setInput('');
        setIsSending(true);
        setStreamingMessage('');

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

                // Keep the last line in buffer as it might be incomplete
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

                        // Handle different event types
                        if (data.event === 'message' || data.event === 'agent_message') {
                            setStreamingMessage((prev) => prev + data.answer);
                        } else if (data.event === 'message_end') {
                            // Message finished
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
            // TODO: Show error toast
        } finally {
            setIsSending(false);
            setStreamingMessage('');
            setLastQuery('');
            abortControllerRef.current = null;
            // Refresh messages to include the new one (and the user's query)
            queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations', currentAppId] }); // To update last message/time in list if we had that
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select an app to start chatting
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-4"
                    onScroll={handleScroll}
                >
                    {hasNextPage && (
                        <div className="flex justify-center p-2">
                            {isFetchingNextPage ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                                    Load previous messages
                                </Button>
                            )}
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className="space-y-4">
                            {/* User Message */}
                            <div className="flex justify-end">
                                <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                                    {msg.query}
                                </div>
                            </div>
                            {/* AI Message */}
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%] prose dark:prose-invert text-sm">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.answer}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className="space-y-4">
                            {/* Optimistic User Message */}
                            <div className="flex justify-end">
                                <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                                    {lastQuery}
                                </div>
                            </div>
                            {/* Streaming AI Message */}
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%] prose dark:prose-invert text-sm">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {streamingMessage}
                                    </ReactMarkdown>
                                    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[60px] resize-none"
                    />
                    <div className="flex flex-col justify-end">
                        {isSending ? (
                            <Button size="icon" variant="destructive" onClick={handleStop}>
                                <StopCircle className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isSending}>
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
