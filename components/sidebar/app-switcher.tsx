'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings/settings-dialog';

export function AppSwitcher() {
    const { apps, currentAppId, setCurrentApp } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const currentApp = apps.find((app) => app.id === currentAppId);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                    >
                        {currentApp ? currentApp.name : 'Select App'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] p-0">
                    <DropdownMenuLabel>Applications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {apps.map((app) => (
                        <DropdownMenuItem
                            key={app.id}
                            onSelect={() => setCurrentApp(app.id)}
                            className="cursor-pointer"
                        >
                            {app.name}
                            {app.isDefault && <span className="ml-2 text-xs text-muted-foreground bg-secondary px-1 rounded">Default</span>}
                            {app.id === currentAppId && <span className="ml-auto">✓</span>}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Apps
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    );
}
