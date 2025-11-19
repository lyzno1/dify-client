# Dify Client

A Next.js client for [Dify](https://dify.ai), allowing you to manage multiple Dify applications and conversations in a unified interface.

## Features

- **Multi-App Support**: Switch between different Dify applications easily.
- **Conversation Management**: Create, delete, and manage conversations.
- **Streaming Chat**: Real-time streaming responses from Dify agents.
- **Markdown Support**: Rich text rendering for AI responses.
- **Local Storage**: App configurations are stored locally in your browser.

## Getting Started

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Run Development Server**

   ```bash
   pnpm dev
   ```

3. **Configure Apps**

   - Open the app in your browser.
   - Click on the App Switcher in the sidebar.
   - Select "Manage Apps".
   - Add your Dify App Name, API Key, and Base URL (default: `https://api.dify.ai/v1`).

## Environment Variables

You can optionally configure default apps via environment variables (not yet implemented in this version, but planned).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand + TanStack Query
- **Icons**: Lucide React
