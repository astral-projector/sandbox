import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./whatsappParser";

function formatMessagesForPrompt(messages: ChatMessage[]): string {
  return messages
    .map((msg) => {
      const ts = msg.timestamp.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `[${ts}] ${msg.sender}: ${msg.content}`;
    })
    .join("\n");
}

export async function generateSummary(
  apiKey: string,
  messages: ChatMessage[]
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const formatted = formatMessagesForPrompt(messages);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are summarizing a WhatsApp group chat. Here are the messages:

---
${formatted}
---

Please provide:
1. A brief "vibe check" line at the top summarizing the overall energy/mood of the chat in this period (one sentence, conversational tone).
2. Then list 5–10 key topics/themes discussed. For each topic:
   - Write it as a bullet point in a succinct, conversational tone
   - Specifically mention which people brought up, dominated, or drove each topic

Keep it concise and readable. Use plain text with bullet points (• character). Do not use markdown headers.`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text;
  }
  return "Unable to generate summary.";
}
