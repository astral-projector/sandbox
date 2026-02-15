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
  messages: ChatMessage[],
  bulletCount: number = 5,
  sentenceCount: number = 3
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const formatted = formatMessagesForPrompt(messages);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are summarizing a WhatsApp group chat. Here are the messages:

---
${formatted}
---

Produce exactly ${bulletCount} bullet points summarizing this chat. Rules:

• Output EXACTLY ${bulletCount} bullet points — this is both the maximum and the target. No more, no fewer.
• Attribute main topics to their speakers. When a bullet covers a key topic, insight, or argument, attribute it to the person who raised or drove it (e.g., "Sarah raised concerns about…", "Mark proposed…"). You don't need to attribute every minor detail — just make sure the reader knows who was behind the major points.
• Each bullet point must be exactly ${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"} long. No more, no less.
${bulletCount <= 5 ? "• With only " + bulletCount + " bullet points, you must ruthlessly prioritize the most important insights and pack maximum information density into each point. Combine related ideas rather than dropping them." : "• With " + bulletCount + " bullet points, give individual topics their own dedicated point where possible."}
• Every bullet must be substantive — no filler, no throat-clearing, no generic statements. Each one should convey a concrete insight, finding, or takeaway.
• Use plain, direct language. Avoid vague summarizations like "The group discussed various aspects of…"
• Prefix each bullet with a short bolded label (e.g., **Market Shift:**).
• Use the • character for bullets.
• Respond with ONLY the bullet points. No preamble, no closing remarks, no headers.`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text;
  }
  return "Unable to generate summary.";
}
