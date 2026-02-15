import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./whatsappParser";

export interface SummaryResult {
  summary: string;
  topics: string[];
  insights: { label: string; text: string }[];
}

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

export function computeTopContributors(
  messages: ChatMessage[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const msg of messages) {
    counts.set(msg.sender, (counts.get(msg.sender) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function generateSummary(
  apiKey: string,
  messages: ChatMessage[],
  bulletCount: number = 5,
  sentenceCount: number = 3
): Promise<SummaryResult> {
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

Return a JSON object with this exact structure (no markdown fences, just raw JSON):

{
  "summary": "A 2-4 sentence prose paragraph summarizing the overall conversation — its mood, arc, and what was accomplished or discussed.",
  "topics": ["Topic1", "Topic2", "Topic3"],
  "insights": [
    { "label": "Short Label", "text": "The insight text here." },
    ...
  ]
}

Rules for the "topics" array:
• Extract 3–7 key topics/themes as short labels (1–3 words each, Title Case).

Rules for the "insights" array:
• Output EXACTLY ${bulletCount} insights — this is both the maximum and the target. No more, no fewer.
• Attribute main topics to their speakers. When an insight covers a key topic, attribute it to the person who raised or drove it (e.g., "Sarah raised concerns about…", "Mark proposed…").
• Each insight "text" must be exactly ${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"} long. No more, no less.
${bulletCount <= 5 ? "• With only " + bulletCount + " insights, ruthlessly prioritize the most important points and pack maximum information density into each. Combine related ideas rather than dropping them." : "• With " + bulletCount + " insights, give individual topics their own dedicated point where possible."}
• Every insight must be substantive — no filler, no generic statements. Each one should convey a concrete finding or takeaway.
• Use plain, direct language. Avoid vague summarizations.

Rules for the "summary" paragraph:
• Conversational but informative tone.
• Mention the overall energy/mood of the chat.

Respond with ONLY the JSON object. No preamble, no closing remarks.`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    return { summary: "Unable to generate summary.", topics: [], insights: [] };
  }

  try {
    const cleaned = block.text.replace(/```json\s*|```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || "",
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    };
  } catch {
    return { summary: block.text, topics: [], insights: [] };
  }
}
