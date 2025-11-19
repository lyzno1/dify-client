'use client';

import * as React from 'react';
import { AppSwitcher } from './app-switcher';
import { ConversationList } from './conversation-list';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
    return (
        <div className="flex flex-col h-full border-r bg-background">
            <div className="p-4">
                <AppSwitcher />
            </div>
            <Separator />
            <div className="flex-1 overflow-hidden">
                <ConversationList />
            </div>
        </div>
    );
}
