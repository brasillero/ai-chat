# AI Chat

A small, text-only chat app built with Next.js (App Router), the [Vercel AI SDK](https://ai-sdk.dev), and [AI Elements](https://elements.ai-sdk.dev). Responses stream in as the model generates them, and nothing is saved: refresh the page and the conversation is gone.

You can point it at OpenAI out of the box, or at a local server like LM Studio, Ollama, or llama.cpp if you'd rather run models yourself.

## What you need

- Node.js 22 or newer
- pnpm

## Getting started

Install the dependencies:

```bash
pnpm install
```

Then create your env file:

```bash
cp .env.example .env.local
```

Open `.env.local` and pick a provider below.

## Picking a provider

### OpenAI (the default)

Drop your API key into `.env.local`:

```env
OPENAI_API_KEY=sk-...
```

That's it. The app talks to `gpt-5.1` unless you say otherwise, and changing models is just another env var:

```env
OPENAI_MODEL=gpt-5-mini
```

### A local server (LM Studio, Ollama, llama.cpp, ...)

If you have a local server running, set two variables instead:

```env
LOCAL_LM_PROVIDER=http://localhost:1234/v1
LOCAL_LM_IDENTIFIER=mistralai/ministral-3-3b
```

`LOCAL_LM_PROVIDER` is the server's OpenAI-compatible URL. The examples above work for LM Studio; for Ollama it's usually `http://localhost:11434/v1`. `LOCAL_LM_IDENTIFIER` is the exact model id the server reports, which you can copy from LM Studio's server tab or get from `ollama list`.

Once `LOCAL_LM_PROVIDER` is set, it wins over OpenAI. Local servers are called through the Chat Completions API (`/v1/chat/completions`), since that's the endpoint they fully support.

## Running it

```bash
pnpm dev
```

Open http://localhost:3000 and start chatting.

A few things worth trying: press Enter to send, or keep typing while the AI is still answering and your message will queue up and send itself when it's free. Assistant messages have a little bookmark button that sets a checkpoint, so you can roll the conversation back to that point later.

## Other scripts

```bash
pnpm build   # production build
pnpm lint    # eslint
```

## How it works

There are only two files that really matter.

`app/api/chat/route.ts` is the server side. It receives the conversation history, picks the provider (OpenAI by default, your local server if `LOCAL_LM_PROVIDER` is set), calls `streamText`, and streams the answer back. Your API key never leaves the server.

`components/chat.tsx` is the client side. The `useChat` hook takes care of messages, streaming, status, stop, and retry, and the UI is put together from AI Elements components like `Conversation`, `Message`, `PromptInput`, and `Queue`.
