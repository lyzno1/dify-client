'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/app-store';
import { difyApi } from '@/lib/api/dify';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConversationList() {
    const { apps, currentAppId, currentConversationId, setCurrentConversation, userId } = useAppStore();
    const queryClient = useQueryClient();
    const currentApp = apps.find((app) => app.id === currentAppId);

    const { data, isLoading, error } = useQuery({
        queryKey: ['conversations', currentAppId],
        queryFn: () => {
            if (!currentApp) return { data: [], has_more: false, limit: 20 };
            return difyApi.getConversations(currentApp, userId);
        },
        enabled: !!currentApp,
    });

    const deleteMutation = useMutation({
        mutationFn: async (conversationId: string) => {
            if (!currentApp) return;
            await difyApi.deleteConversation(currentApp, conversationId, userId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', currentAppId] });
            if (currentConversationId) {
                // If deleted current conversation, deselect it
                // Logic to check if deleted ID matches current ID needs the ID passed to mutation
                // But here we can just invalidate and let UI update, or handle selection reset
            }
        },
    });

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
            deleteMutation.mutate(id);
            if (currentConversationId === id) {
                setCurrentConversation(null);
            }
        }
    };

    if (!currentApp) {
        return <div className="p-4 text-sm text-muted-foreground">Please select an app</div>;
    }

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4" /></div>;
    }

    if (error) {
        return <div className="p-4 text-sm text-destructive">Error loading conversations</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-2">
                <Button
                    className="w-full justify-start"
                    variant="secondary"
                    onClick={() => setCurrentConversation(null)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Chat
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                    {data?.data.map((conv) => (
                        <div
                            key={conv.id}
                            className={cn(
                                "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                                currentConversationId === conv.id ? "bg-accent text-accent-foreground" : "transparent"
                            )}
                            onClick={() => setCurrentConversation(conv.id)}
                        >
                            <div className="flex items-center truncate">
                                <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{conv.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDelete(e, conv.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                    {data?.data.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-4">
                            No conversations yet
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
