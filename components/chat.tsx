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
