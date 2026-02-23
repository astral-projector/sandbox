import type { SummaryResult } from "./summarize";

interface ExportData {
  dateRange: string;
  messageCount: number;
  memberCount: number;
  summary: SummaryResult;
  topContributors: { name: string; count: number }[];
}

export function exportToMarkdown(data: ExportData): string {
  const lines: string[] = [];

  lines.push(`# ${data.dateRange}`);
  lines.push("");
  lines.push(`**${data.messageCount} messages** · **${data.memberCount} members**`);
  lines.push("");

  if (data.summary.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(data.summary.summary);
    lines.push("");
  }

  if (data.summary.topics.length > 0) {
    lines.push("## Key Topics");
    lines.push("");
    for (const topic of data.summary.topics) {
      lines.push(`- ${topic}`);
    }
    lines.push("");
  }

  if (data.summary.insights.length > 0) {
    lines.push("## Key Insights");
    lines.push("");
    for (const insight of data.summary.insights) {
      lines.push(`- **${insight.label}:** ${insight.text}`);
    }
    lines.push("");
  }

  if (data.topContributors.length > 0) {
    lines.push("## Top Contributors");
    lines.push("");
    for (const c of data.topContributors) {
      lines.push(`- **${c.name}** (${c.count})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
