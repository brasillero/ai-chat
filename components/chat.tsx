"use client";

import { Fragment, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { BookmarkPlusIcon, MessageSquareIcon, Trash2Icon } from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Queue,
  QueueItem,
  QueueItemAction,
  QueueItemActions,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";

type SourceUrlPart = Extract<
  UIMessage["parts"][number],
  { type: "source-url" }
>;

export function Chat() {
  const [input, setInput] = useState("");
  // Indexes into `messages` where the user placed a checkpoint.
  const [checkpoints, setCheckpoints] = useState<number[]>([]);
  // Messages typed while the AI is busy; flushed FIFO when it becomes ready.
  const [queue, setQueue] = useState<string[]>([]);
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) return;
    if (status === "ready") {
      sendMessage({ text });
    } else {
      setQueue((prev) => [...prev, text]);
    }
    setInput("");
  };

  useEffect(() => {
    if (status !== "ready" || queue.length === 0) return;
    const [next, ...rest] = queue;
    sendMessage({ text: next });
    // Dequeue asynchronously to avoid a synchronous cascading render.
    queueMicrotask(() => setQueue(rest));
  }, [status, queue, sendMessage]);

  const createCheckpoint = (index: number) => {
    setCheckpoints((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  const restoreToCheckpoint = (index: number) => {
    setMessages(messages.slice(0, index + 1));
    setCheckpoints((prev) => prev.filter((cp) => cp <= index));
  };

  const removeQueued = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
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
            messages.map((message, index) => {
              const isUser = message.role === "user";
              const sourceParts = message.parts.filter(
                (part): part is SourceUrlPart => part.type === "source-url",
              );
              return (
                <Fragment key={message.id}>
                  <Message from={message.role}>
                    <MessageContent>
                      {!isUser && sourceParts.length > 0 && (
                        <Sources>
                          <SourcesTrigger count={sourceParts.length} />
                          <SourcesContent>
                            {sourceParts.map((part, partIndex) => (
                              <Source
                                key={`${message.id}-source-${partIndex}`}
                                href={part.url}
                                title={part.title ?? part.url}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}
                      {message.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse
                                key={`${message.id}-${partIndex}`}
                              >
                                {part.text}
                              </MessageResponse>
                            );
                          case "reasoning":
                            return (
                              <ChainOfThought
                                key={`${message.id}-${partIndex}`}
                              >
                                <ChainOfThoughtHeader>
                                  Chain of thought
                                </ChainOfThoughtHeader>
                                <ChainOfThoughtContent>
                                  <ChainOfThoughtStep
                                    label="Reasoning"
                                    description={part.text}
                                    status={
                                      status === "streaming"
                                        ? "active"
                                        : "complete"
                                    }
                                  />
                                </ChainOfThoughtContent>
                              </ChainOfThought>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                    {!isUser && (
                      <MessageActions>
                        <MessageAction
                          tooltip="Create checkpoint"
                          label="Create checkpoint"
                          onClick={() => createCheckpoint(index)}
                        >
                          <BookmarkPlusIcon className="size-4" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                  {checkpoints.includes(index) && (
                    <Checkpoint>
                      <CheckpointIcon />
                      <CheckpointTrigger
                        onClick={() => restoreToCheckpoint(index)}
                      >
                        Restore checkpoint
                      </CheckpointTrigger>
                    </Checkpoint>
                  )}
                </Fragment>
              );
            })
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

      {queue.length > 0 && (
        <Queue className="mb-2">
          <QueueSection defaultOpen>
            <QueueSectionTrigger>
              <QueueSectionLabel count={queue.length} label="Queued" />
            </QueueSectionTrigger>
            <QueueSectionContent>
              <QueueList>
                {queue.map((text, index) => (
                  <QueueItem key={`${index}-${text}`}>
                    <QueueItemIndicator />
                    <QueueItemContent>{text}</QueueItemContent>
                    <QueueItemActions>
                      <QueueItemAction
                        aria-label="Remove from queue"
                        onClick={() => removeQueued(index)}
                      >
                        <Trash2Icon className="size-4" />
                      </QueueItemAction>
                    </QueueItemActions>
                  </QueueItem>
                ))}
              </QueueList>
            </QueueSectionContent>
          </QueueSection>
        </Queue>
      )}

      <PromptInput onSubmit={handleSubmit} className="relative mb-4">
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type a message..."
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
