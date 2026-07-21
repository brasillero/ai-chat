"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquareIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-12" />}
              title="Start a conversation"
              description="Type a message below to chat with the AI."
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

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

      <PromptInput onSubmit={handleSubmit} className="relative mb-4">
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type a message..."
          disabled={status !== "ready"}
          className="pr-12"
        />
        <PromptInputSubmit
          status={status}
          onStop={stop}
          disabled={status === "ready" && !input.trim()}
          className="absolute right-1 bottom-1"
        />
      </PromptInput>
    </div>
  );
}
