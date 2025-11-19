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
                        className="w-full justify-between h-12 px-3 bg-background/50 backdrop-blur-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                                <span className="text-xs font-bold">{currentApp?.name.charAt(0).toUpperCase() || 'A'}</span>
                            </div>
                            <span className="truncate font-medium">{currentApp ? currentApp.name : 'Select App'}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-1" align="start">
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">Applications</DropdownMenuLabel>
                    {apps.map((app) => (
                        <DropdownMenuItem
                            key={app.id}
                            onSelect={() => setCurrentApp(app.id)}
                            className="cursor-pointer flex items-center justify-between px-2 py-2 rounded-sm focus:bg-accent"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <div className="flex h-5 w-5 items-center justify-center rounded border bg-background/50">
                                    <span className="text-[10px] font-bold">{app.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="truncate">{app.name}</span>
                            </div>
                            {app.id === currentAppId && <span className="text-primary text-xs">Active</span>}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="cursor-pointer px-2 py-2 text-muted-foreground focus:text-foreground">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Apps
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    );
}
