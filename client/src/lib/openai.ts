import { Message } from "@/lib/types";

interface OpenAICompletionParams {
  messages: Message[];
}

interface OpenAICompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
  }[];
}

export async function generateCompletion(
  params: OpenAICompletionParams
): Promise<string> {
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: params.messages[params.messages.length - 1].content,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to generate completion: ${text}`);
    }

    const data = await response.json();
    return data.assistantMessage.content;
  } catch (error) {
    console.error("Error generating completion:", error);
    throw error;
  }
}
