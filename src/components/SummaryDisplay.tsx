import { useState, useRef, useCallback } from "react";
import type { SummaryResult } from "../lib/summarize";
import { exportToHtml } from "../lib/exportHtml";
import { exportToMarkdown } from "../lib/exportMarkdown";
import { buildShareUrl } from "../lib/shareUtils";

interface SummaryDisplayProps {
  summary: SummaryResult | null;
  onSummaryChange: (summary: SummaryResult) => void;
  isLoading: boolean;
  error: string | null;
  fromDate: Date;
  toDate: Date;
  messageCount: number;
  memberCount: number;
  topContributors: { name: string; count: number }[];
  onLinkShared?: () => void;
}

function formatRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fromStr = from.toLocaleDateString("en-US", opts);
  const toStr = to.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${fromStr} - ${toStr}`;
}

function EditableText({
  value,
  onChange,
  className,
  tag: Tag = "p",
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  tag?: "p" | "span";
}) {
  const ref = useRef<HTMLElement>(null);

  const handleBlur = useCallback(() => {
    const el = ref.current;
    if (el && el.textContent !== null && el.textContent !== value) {
      onChange(el.textContent);
    }
  }, [onChange, value]);

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-indigo-50/30 rounded px-0.5 -mx-0.5 transition-colors ${className ?? ""}`}
    >
      {value}
    </Tag>
  );
}

export default function SummaryDisplay({
  summary,
  onSummaryChange,
  isLoading,
  error,
  fromDate,
  toDate,
  messageCount,
  memberCount,
  topContributors,
  onLinkShared,
}: SummaryDisplayProps) {
  const [expanded, setExpanded] = useState(true);

  const updateSummaryText = useCallback(
    (text: string) => {
      if (summary) onSummaryChange({ ...summary, summary: text });
    },
    [summary, onSummaryChange]
  );

  const updateTopic = useCallback(
    (index: number, text: string) => {
      if (!summary) return;
      const topics = [...summary.topics];
      if (text.trim() === "") {
        topics.splice(index, 1);
      } else {
        topics[index] = text;
      }
      onSummaryChange({ ...summary, topics });
    },
    [summary, onSummaryChange]
  );

  const updateInsightLabel = useCallback(
    (index: number, label: string) => {
      if (!summary) return;
      const insights = summary.insights.map((ins, i) =>
        i === index ? { ...ins, label } : ins
      );
      onSummaryChange({ ...summary, insights });
    },
    [summary, onSummaryChange]
  );

  const updateInsightText = useCallback(
    (index: number, text: string) => {
      if (!summary) return;
      const insights = summary.insights.map((ins, i) =>
        i === index ? { ...ins, text } : ins
      );
      onSummaryChange({ ...summary, insights });
    },
    [summary, onSummaryChange]
  );

  const removeInsight = useCallback(
    (index: number) => {
      if (!summary) return;
      const insights = summary.insights.filter((_, i) => i !== index);
      onSummaryChange({ ...summary, insights });
    },
    [summary, onSummaryChange]
  );

  const handleExport = useCallback(() => {
    if (!summary) return;
    const html = exportToHtml({
      dateRange: formatRange(fromDate, toDate),
      messageCount,
      memberCount,
      summary,
      topContributors,
    });

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-summary-${fromDate.toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [summary, fromDate, toDate, messageCount, memberCount, topContributors]);

  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyMarkdown = useCallback(() => {
    if (!summary) return;
    const md = exportToMarkdown({
      dateRange: formatRange(fromDate, toDate),
      messageCount,
      memberCount,
      summary,
      topContributors,
    });
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary, fromDate, toDate, messageCount, memberCount, topContributors]);

  const handleShare = useCallback(() => {
    if (!summary) return;
    const url = buildShareUrl({
      dateRange: formatRange(fromDate, toDate),
      messageCount,
      memberCount,
      summary,
      topContributors,
    });
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      onLinkShared?.();
    });
  }, [summary, fromDate, toDate, messageCount, memberCount, topContributors, onLinkShared]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            Generating summary...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {formatRange(fromDate, toDate)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {messageCount} messages &middot; {memberCount} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            onClick={handleExport}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export HTML
          </button>
          <button
            onClick={handleShare}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {linkCopied ? "Link Copied!" : "Share"}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-6 py-5 space-y-5">
          <p className="text-[10px] text-gray-400 italic">Click any text to edit</p>

          {/* Summary paragraph */}
          {summary.summary && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Summary
              </h3>
              <EditableText
                value={summary.summary}
                onChange={updateSummaryText}
                className="text-sm text-gray-700 leading-relaxed"
              />
            </div>
          )}

          {/* Key Topics */}
          {summary.topics.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Key Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, i) => (
                  <span
                    key={i}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      updateTopic(i, e.currentTarget.textContent ?? "")
                    }
                    className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {summary.insights.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Key Insights
              </h3>
              <ul className="space-y-3">
                {summary.insights.map((insight, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-700 leading-relaxed group flex gap-2"
                  >
                    <div className="flex-1">
                      <EditableText
                        value={insight.label}
                        onChange={(val) => updateInsightLabel(i, val)}
                        className="font-semibold text-gray-900 inline"
                        tag="span"
                      />
                      <span className="font-semibold text-gray-900">: </span>
                      <EditableText
                        value={insight.text}
                        onChange={(val) => updateInsightText(i, val)}
                        className="inline"
                        tag="span"
                      />
                    </div>
                    <button
                      onClick={() => removeInsight(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity shrink-0 mt-0.5"
                      title="Remove insight"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Contributors */}
          {topContributors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Top Contributors
              </h3>
              <div className="flex flex-wrap gap-2">
                {topContributors.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                  >
                    {c.name} ({c.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
