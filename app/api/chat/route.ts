import { createOpenAI, openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Default provider: OpenAI (requires OPENAI_API_KEY).
// Model can be overridden with the OPENAI_MODEL env variable.
// Override: set LOCAL_LM_PROVIDER to an OpenAI-compatible base URL
// (llama.cpp, LM Studio, Ollama, ...) plus LOCAL_LM_IDENTIFIER.
const DEFAULT_OPENAI_MODEL = "gpt-5.1";

function resolveModel() {
  const localBaseURL = process.env.LOCAL_LM_PROVIDER;

  if (localBaseURL) {
    const identifier = process.env.LOCAL_LM_IDENTIFIER;
    if (!identifier) {
      throw new Error(
        "LOCAL_LM_IDENTIFIER is required when LOCAL_LM_PROVIDER is set.",
      );
    }
    const local = createOpenAI({
      baseURL: localBaseURL,
      apiKey: process.env.OPENAI_API_KEY || "not-needed",
    });
    // Use the Chat Completions API (/v1/chat/completions): local servers
    // (LM Studio, llama.cpp, Ollama) only partially implement the Responses
    // API that provider(id) targets, and reject multi-turn input history.
    return local.chat(identifier);
  }

  return openai(process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  let model;
  try {
    model = resolveModel();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid model configuration." },
      { status: 500 },
    );
  }

  const result = streamText({
    model,
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
