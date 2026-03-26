import type { VercelRequest, VercelResponse } from "@vercel/node";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

function makeHeading2(text: string): NotionBlock {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function makeParagraph(text: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function makeBullet(text: string, bold?: string): NotionBlock {
  const richText: unknown[] = [];
  if (bold) {
    richText.push({
      type: "text",
      text: { content: bold + ": " },
      annotations: { bold: true },
    });
  }
  richText.push({ type: "text", text: { content: text } });
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: richText },
  };
}

function makeDivider(): NotionBlock {
  return { object: "block", type: "divider", divider: {} };
}

async function notionFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  return fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

async function clearPageContent(pageId: string, token: string) {
  // Fetch existing children
  const resp = await notionFetch(
    `/blocks/${pageId}/children?page_size=100`,
    token
  );
  if (!resp.ok) return;
  const data = await resp.json();
  const blocks = data.results ?? [];

  // Delete each block
  for (const block of blocks) {
    await notionFetch(`/blocks/${block.id}`, token, { method: "DELETE" });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, pageId, summary } = req.body ?? {};
  if (!token || !pageId || !summary) {
    return res.status(400).json({ error: "Missing token, pageId, or summary" });
  }

  try {
    // Clear existing content
    await clearPageContent(pageId, token);

    // Build Notion blocks from summary data
    const blocks: NotionBlock[] = [];

    // Header info
    blocks.push(
      makeParagraph(
        `${summary.dateRange}  •  ${summary.messageCount} messages  •  ${summary.memberCount} members`
      )
    );
    blocks.push(makeDivider());

    // Summary
    if (summary.summary?.summary) {
      blocks.push(makeHeading2("Summary"));
      blocks.push(makeParagraph(summary.summary.summary));
    }

    // Key Topics
    if (summary.summary?.topics?.length > 0) {
      blocks.push(makeHeading2("Key Topics"));
      for (const topic of summary.summary.topics) {
        blocks.push(makeBullet(topic));
      }
    }

    // Key Insights
    if (summary.summary?.insights?.length > 0) {
      blocks.push(makeHeading2("Key Insights"));
      for (const insight of summary.summary.insights) {
        blocks.push(makeBullet(insight.text, insight.label));
      }
    }

    // Top Contributors
    if (summary.topContributors?.length > 0) {
      blocks.push(makeHeading2("Top Contributors"));
      for (const c of summary.topContributors) {
        blocks.push(makeBullet(`${c.name} (${c.count})`));
      }
    }

    // Append blocks to page
    const appendResp = await notionFetch(`/blocks/${pageId}/children`, token, {
      method: "PATCH",
      body: JSON.stringify({ children: blocks }),
    });

    if (!appendResp.ok) {
      const errData = await appendResp.json();
      return res
        .status(appendResp.status)
        .json({ error: errData.message || "Notion API error" });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Failed to reach Notion API" });
  }
}
