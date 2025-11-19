'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Brain, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { Streamdown } from 'streamdown';

interface ThinkBlockProps {
    content: string;
    isStreaming?: boolean;
    className?: string;
}

export function ThinkBlock({ content, isStreaming, className }: ThinkBlockProps) {
    const [isOpen, setIsOpen] = React.useState(true);
    const isEmpty = !content;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn("my-4 border rounded-lg bg-muted/30 overflow-hidden w-full", className)}
        >
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b select-none">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Brain className="w-4 h-4" />
                    <span>Thinking Process</span>
                    {isStreaming && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/80">
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isOpen && "-rotate-90")} />
                        <span className="sr-only">Toggle thinking process</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="p-4 text-sm text-muted-foreground/80 leading-relaxed border-t bg-background/50">
                    <Streamdown className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50">
                        {content}
                    </Streamdown>
                    {isEmpty && isStreaming && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/50">
                            <span>Thinking...</span>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
