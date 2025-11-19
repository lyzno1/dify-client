import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppConfig {
    id: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    appType: 'chatbot' | 'workflow' | 'completion';
}

interface AppState {
    apps: AppConfig[];
    currentAppId: string | null;
    currentConversationId: string | null;
    userId: string; // Local user identifier for Dify API

    // Actions
    addApp: (app: AppConfig) => void;
    updateApp: (id: string, updates: Partial<AppConfig>) => void;
    removeApp: (id: string) => void;
    setCurrentApp: (id: string) => void;
    setCurrentConversation: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            apps: [],
            currentAppId: null,
            currentConversationId: null,
            userId: 'user-' + Math.random().toString(36).substring(2, 9), // Simple random user ID

            addApp: (app) => set((state) => ({
                apps: [...state.apps, app],
                currentAppId: state.currentAppId || app.id // Auto-select first app
            })),

            updateApp: (id, updates) => set((state) => ({
                apps: state.apps.map((app) => app.id === id ? { ...app, ...updates } : app)
            })),

            removeApp: (id) => set((state) => ({
                apps: state.apps.filter((app) => app.id !== id),
                currentAppId: state.currentAppId === id ? (state.apps.find((a) => a.id !== id)?.id || null) : state.currentAppId
            })),

            setCurrentApp: (id) => set({ currentAppId: id, currentConversationId: null }),

            setCurrentConversation: (id) => set({ currentConversationId: id }),
        }),
        {
            name: 'dify-client-storage',
        }
    )
);
