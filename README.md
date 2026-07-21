# AI Chat

A minimal, text-only AI chat app built with Next.js (App Router), the [Vercel AI SDK](https://ai-sdk.dev), and [AI Elements](https://elements.ai-sdk.dev) components.

- Streaming responses via `streamText` (AI SDK Core) and `useChat` (AI SDK UI)
- Default provider: OpenAI
- Optional local provider: any OpenAI-compatible server (LM Studio, Ollama, llama.cpp, ...)
- No persistence — conversations reset on refresh

## Prerequisites

- Node.js 22+
- pnpm

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your env file:

   ```bash
   cp .env.example .env.local
   ```

3. Configure a provider in `.env.local` (see below).

## Provider configuration

### Option A — OpenAI (default)

```env
OPENAI_API_KEY=sk-...
```

The model defaults to `gpt-5.1`; set `OPENAI_MODEL` in `.env.local` to use another (fallback constant: `DEFAULT_OPENAI_MODEL` in `app/api/chat/route.ts`).

### Option B — Local provider (LM Studio, Ollama, llama.cpp, ...)

Set **both** variables — when `LOCAL_LM_PROVIDER` is defined it takes precedence over OpenAI:

```env
LOCAL_LM_PROVIDER=http://localhost:1234/v1
LOCAL_LM_IDENTIFIER=mistralai/ministral-3-3b
```

- `LOCAL_LM_PROVIDER` — the server's OpenAI-compatible base URL (`http://localhost:1234/v1` for LM Studio, `http://localhost:11434/v1` for Ollama).
- `LOCAL_LM_IDENTIFIER` — the exact model id the server exposes (copy it from LM Studio's server tab, or `ollama list`).

Local servers are called through the Chat Completions API (`/v1/chat/completions`), the endpoint they fully support.

## Run locally

```bash
pnpm dev
```

Open http://localhost:3000 and start chatting.

## Other scripts

```bash
pnpm build   # production build
pnpm lint    # eslint
```

## How it works

- `app/api/chat/route.ts` — POST endpoint: receives the `UIMessage[]` history from the client, picks the provider (OpenAI by default, local when `LOCAL_LM_PROVIDER` is set), calls `streamText`, and streams the response back. Your API key never leaves the server.
- `components/chat.tsx` — client component: `useChat` manages messages, streaming, status, stop, and retry; AI Elements components (`Conversation`, `Message`, `PromptInput`) render the UI.
