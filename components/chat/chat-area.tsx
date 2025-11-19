'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

    // Fetch history
    const { data: historyData, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['messages', currentConversationId],
        queryFn: () => {
            if (!currentApp || !currentConversationId) return { data: [], has_more: false, limit: 20 };
            return difyApi.getMessages(currentApp, currentConversationId, userId);
        },
        enabled: !!currentApp && !!currentConversationId,
    });

    // Combine history and current streaming message
    // Note: Dify history is usually reverse chronological or chronological? 
    // The user provided example doesn't specify sort order, but usually chat APIs return latest first or require pagination.
    // Let's assume we need to reverse them if they come latest-first, or just display as is.
    // Usually chat UIs display oldest at top.
    // If `first_id` is used for pagination, it suggests fetching backwards.
    // Let's assume the API returns a list. We might need to sort by created_at.

    const messages = React.useMemo(() => {
        if (!historyData?.data) return [];
        // Sort by created_at ascending
        return [...historyData.data].sort((a, b) => a.created_at - b.created_at);
    }, [historyData]);

    React.useEffect(() => {
        // Scroll to bottom on new messages
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingMessage]);

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

            while (loop) {
                const { done, value } = await reader.read();
                if (done) {
                    loop = false;
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
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
                                // If it's a new conversation, we might get the ID here
                                if (data.conversation_id && !currentConversationId) {
                                    setCurrentConversation(data.conversation_id);
                                }
                            }
                            // Handle other events like 'error'
                        } catch (e) {
                            console.error('Error parsing SSE:', e);
                        }
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
                >
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
