# Basic Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-screen, text-only AI chat: message list (user + AI bubbles) and a composer text area, streaming responses via the Vercel AI SDK.

**Architecture:** Next.js App Router. A Route Handler (`app/api/chat/route.ts`) calls `streamText` (AI SDK Core, OpenAI provider) and returns a UI message stream; a client component (`components/chat.tsx`) consumes it with `useChat` (AI SDK UI) and renders messages with the repo's existing shadcn/ui chat components (`Message`, `MessageScroller`, `Bubble`, `Textarea`, `Button`, `Empty`).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (already installed), Vercel AI SDK v7 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`).

**Explicitly out of scope** (per spec): sidebar, chat history/session storage or any persistence, tools/tool-calling, attachments, auth, markdown rendering.

**Decisions already made with the user:**
- Provider: **OpenAI direct** (`@ai-sdk/openai` + `OPENAI_API_KEY`).
- Verification: **manual checks** (dev server + `tsc` + `eslint` + `next build`). No test runner gets installed.

**Git note:** the project is not yet a git repository. Task 1 initializes one so the per-task commits below work. If the user prefers no git, skip `git init` and every commit step (do not improvise alternatives).

**Prerequisite (user action):** an OpenAI API key. It is needed in Task 1 and the smoke tests in Tasks 2 and 4 will fail without it.

---

### Task 1: Install AI SDK dependencies and configure the OpenAI key

**Files:**
- Modify: `package.json` (via pnpm)
- Create: `.env.local`

- [ ] **Step 1: Initialize git and make the initial commit (enables per-task checkpoints)**

```bash
git init
git add .
git commit -m "chore: initial commit (create-next-app + shadcn/ui)"
```

Expected: `Initialized empty Git repository ...`, then a commit containing the existing starter code. `.gitignore` already excludes `node_modules` and `.env*`, so nothing sensitive or generated is committed.

- [ ] **Step 2: Install the AI SDK packages**

```bash
pnpm add ai @ai-sdk/react @ai-sdk/openai
```

Expected: all three appear under `dependencies` in `package.json`.

- [ ] **Step 3: Create `.env.local` with the OpenAI key**

Create `.env.local` in the project root with this content (the user pastes their real key):

```env
OPENAI_API_KEY=sk-your-real-key-here
```

Notes:
- `.gitignore` already ignores `.env*`, so the key cannot be committed.
- `@ai-sdk/openai` reads `OPENAI_API_KEY` automatically; no code wiring needed.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml docs/
git commit -m "chore: add Vercel AI SDK dependencies"
```

(`.env.local` is intentionally not added — it is gitignored.)

---

### Task 2: Chat API route handler

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Create the route handler**

Create `app/api/chat/route.ts`:

```ts
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5.1"),
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

What each piece does (context for the implementer):
- `UIMessage[]` is the client-side message format (has `id`, `role`, `parts`).
- `convertToModelMessages` strips UI metadata into the `ModelMessage[]` the model expects (async in AI SDK v7 — keep the `await`).
- `toUIMessageStream` + `createUIMessageStreamResponse` produce the streamed HTTP response `useChat` consumes.

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 3: Smoke-test the endpoint with curl**

Start the dev server in the background:

```bash
pnpm dev
```

Wait for `Ready` / `Local: http://localhost:3000`, then in another shell:

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"msg-1","role":"user","parts":[{"type":"text","text":"Say hello in one word."}]}]}'
```

Expected: a stream of `data: {...}` JSON chunks including text deltas (e.g. chunks with `"type":"text-delta"`), not an HTTP 500 or an auth error. If you get an auth error, `OPENAI_API_KEY` in `.env.local` is wrong or missing — fix it and restart the dev server.

Stop the dev server afterwards.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add chat API route handler"
```

---

### Task 3: Chat client component

**Files:**
- Create: `components/chat.tsx`

- [ ] **Step 1: Create the component**

Create `components/chat.tsx`. All imported shadcn/ui components already exist in `components/ui/` — do not reinstall or regenerate them:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowUpIcon,
  SparklesIcon,
  SquareIcon,
  UserIcon,
} from "lucide-react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-dvh flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
        <div className="min-h-0 flex-1">
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.length === 0 ? (
                    <Empty className="m-auto">
                      <EmptyHeader>
                        <EmptyTitle>Start a conversation</EmptyTitle>
                        <EmptyDescription>
                          Type a message below to chat with the AI.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.role === "user";
                      return (
                        <MessageScrollerItem key={message.id}>
                          <Message align={isUser ? "end" : "start"}>
                            <MessageAvatar className="size-8">
                              {isUser ? (
                                <UserIcon className="size-4" />
                              ) : (
                                <SparklesIcon className="size-4" />
                              )}
                            </MessageAvatar>
                            <MessageContent>
                              {message.parts.map((part, index) =>
                                part.type === "text" ? (
                                  <Bubble
                                    key={index}
                                    variant={isUser ? "default" : "muted"}
                                  >
                                    <BubbleContent className="whitespace-pre-wrap">
                                      {part.text}
                                    </BubbleContent>
                                  </Bubble>
                                ) : null,
                              )}
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      );
                    })
                  )}
                  {status === "submitted" && (
                    <MessageScrollerItem>
                      <Message align="start">
                        <MessageAvatar className="size-8">
                          <SparklesIcon className="size-4" />
                        </MessageAvatar>
                        <MessageContent>
                          <Bubble variant="muted">
                            <BubbleContent className="text-muted-foreground">
                              Thinking…
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-destructive">
            <span>Something went wrong.</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => regenerate()}
            >
              Retry
            </Button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t py-4"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="max-h-40 resize-none"
            disabled={isBusy}
          />
          {isBusy ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => stop()}
            >
              <SquareIcon />
              <span className="sr-only">Stop generating</span>
            </Button>
          ) : (
            <Button type="submit" size="icon-sm" disabled={!input.trim()}>
              <ArrowUpIcon />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
```

Key wiring notes (context for the implementer):
- `useChat` drives everything; `DefaultChatTransport` posts to `/api/chat` (Task 2's route).
- Messages render from `message.parts`, not a `content` string (AI SDK v7 convention); only `text` parts are rendered.
- `Message align="end"` puts user messages on the right (the component flips via `data-align`); `Bubble variant="default"` (primary) for the user, `"muted"` for the assistant.
- `status` values are `submitted | streaming | ready | error`; `isBusy` disables the composer and swaps the send button for a stop button.

- [ ] **Step 2: Type-check and lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat.tsx
git commit -m "feat: add chat client component"
```

---

### Task 4: Wire the page, update metadata, verify end-to-end

**Files:**
- Modify: `app/page.tsx` (full replacement)
- Modify: `app/layout.tsx:15-18` (metadata only)

- [ ] **Step 1: Replace the starter page**

Replace the entire contents of `app/page.tsx` with:

```tsx
import { Chat } from "@/components/chat";

export default function Home() {
  return <Chat />;
}
```

- [ ] **Step 2: Update the page metadata**

In `app/layout.tsx`, replace the `metadata` export:

```ts
export const metadata: Metadata = {
  title: "AI Chat",
  description: "A simple AI chat built with the Vercel AI SDK and shadcn/ui",
};
```

Leave everything else in `app/layout.tsx` untouched.

- [ ] **Step 3: Type-check and lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both pass with no errors.

- [ ] **Step 4: Manual browser verification**

```bash
pnpm dev
```

Open http://localhost:3000 and verify, in order:
1. Empty state shows "Start a conversation".
2. Type a message and press Enter — the input clears, your bubble appears on the right, a "Thinking…" bubble appears, then the AI response streams into a muted bubble on the left.
3. While streaming, the text area is disabled and the send button shows a stop (square) icon; clicking it aborts the response.
4. Send several messages — the view auto-scrolls to the latest message; the scroll-to-end button works when scrolled up.
5. Shift+Enter inserts a newline instead of sending.
6. Refresh the page — messages are gone (no persistence; this is intended).

Stop the dev server afterwards.

- [ ] **Step 5: Production build**

```bash
pnpm build
```

Expected: build completes successfully with no type or lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire chat page and update metadata"
```

---

## Self-review notes (already applied)

- **Spec coverage:** chat screen (Tasks 3–4), text area composer (Task 3), user/AI messages (Task 3), shadcn/ui components throughout (Task 3), streaming AI responses (Task 2). No sidebar/persistence/tasks beyond scope — nothing in the plan adds them; verification step 6 of Task 4 confirms no persistence.
- **Type consistency:** `UIMessage` / `message.parts` / `part.type === "text"` used identically in Tasks 2 and 3; `size="icon-sm"` and `variant="outline" | "link" | "muted"` match the actual exports in `components/ui/button.tsx` and `components/ui/bubble.tsx`; `Empty*` exports match `components/ui/empty.tsx`.
- **No placeholders:** every code step contains the complete file content; the only user-supplied value is the real API key in Task 1 Step 3 (cannot be invented).
