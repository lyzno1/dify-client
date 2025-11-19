'use client';

import * as React from 'react';
import { useAppStore, AppConfig } from '@/lib/store/app-store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Need to install label
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

export function SettingsDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { apps, addApp, removeApp } = useAppStore();
    const [newApp, setNewApp] = React.useState<Partial<AppConfig>>({
        baseUrl: 'https://api.dify.ai/v1',
        appType: 'chatbot',
    });

    const handleAdd = () => {
        if (newApp.name && newApp.apiKey && newApp.baseUrl) {
            addApp({
                id: crypto.randomUUID(),
                name: newApp.name,
                apiKey: newApp.apiKey,
                baseUrl: newApp.baseUrl,
                appType: newApp.appType as any,
            });
            setNewApp({
                baseUrl: 'https://api.dify.ai/v1',
                appType: 'chatbot',
                name: '',
                apiKey: '',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Applications</DialogTitle>
                    <DialogDescription>
                        Add your Dify applications here. API Keys are stored locally.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Add New App</h4>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label htmlFor="name" className="text-sm font-medium">Name</label>
                                <Input
                                    id="name"
                                    value={newApp.name || ''}
                                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                                    className="col-span-2"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label htmlFor="apiKey" className="text-sm font-medium">API Key</label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    value={newApp.apiKey || ''}
                                    onChange={(e) => setNewApp({ ...newApp, apiKey: e.target.value })}
                                    className="col-span-2"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label htmlFor="baseUrl" className="text-sm font-medium">Base URL</label>
                                <Input
                                    id="baseUrl"
                                    value={newApp.baseUrl || ''}
                                    onChange={(e) => setNewApp({ ...newApp, baseUrl: e.target.value })}
                                    className="col-span-2"
                                />
                            </div>
                            <Button onClick={handleAdd} disabled={!newApp.name || !newApp.apiKey}>Add App</Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Existing Apps</h4>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {apps.map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-2 border rounded">
                                    <div className="truncate">
                                        <div className="font-medium">{app.name}</div>
                                        <div className="text-xs text-muted-foreground truncate">{app.baseUrl}</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeApp(app.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {apps.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">No apps configured</div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
