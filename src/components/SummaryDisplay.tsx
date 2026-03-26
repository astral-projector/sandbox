import { useState, useRef, useCallback } from "react";
import type { SummaryResult } from "../lib/summarize";
import { exportToHtml } from "../lib/exportHtml";
import { exportToMarkdown } from "../lib/exportMarkdown";
import { publishSummary, getPublishedUrl } from "../lib/shareUtils";
import NotionModal, { getNotionSettings } from "./NotionModal";

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
}: SummaryDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(
    () => getPublishedUrl()
  );
  const [publishing, setPublishing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionStatus, setNotionStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

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

  const handlePublish = useCallback(async () => {
    if (!summary) return;
    setPublishing(true);
    try {
      const url = await publishSummary({
        dateRange: formatRange(fromDate, toDate),
        messageCount,
        memberCount,
        summary,
        topContributors,
      });
      setPublishedUrl(url);
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } finally {
      setPublishing(false);
    }
  }, [summary, fromDate, toDate, messageCount, memberCount, topContributors]);

  const handleCopyUrl = useCallback(() => {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }, [publishedUrl]);

  const exportToNotion = useCallback(
    async (settings: { token: string; pageId: string }) => {
      if (!summary) return;
      setShowNotionModal(false);
      setNotionStatus("sending");
      try {
        const resp = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: settings.token,
            pageId: settings.pageId,
            summary: {
              dateRange: formatRange(fromDate, toDate),
              messageCount,
              memberCount,
              summary,
              topContributors,
            },
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || "Notion export failed");
        }
        setNotionStatus("done");
        setTimeout(() => setNotionStatus("idle"), 2500);
      } catch {
        setNotionStatus("error");
        setTimeout(() => setNotionStatus("idle"), 3000);
      }
    },
    [summary, fromDate, toDate, messageCount, memberCount, topContributors]
  );

  const handleNotionExport = useCallback(() => {
    const settings = getNotionSettings();
    if (settings) {
      exportToNotion(settings);
    } else {
      setShowNotionModal(true);
    }
  }, [exportToNotion]);

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
            onClick={handleNotionExport}
            disabled={notionStatus === "sending"}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.493-.933l-4.577-7.186v6.952l1.447.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.726l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.64 1.782l13.635-.933c1.68-.14 2.1.093 2.8.606l3.876 2.753c.466.326.606.746.606 1.26v15.372c0 .933-.327 1.54-1.54 1.634L6.743 23.52c-.887.047-1.307-.093-1.773-.7L1.88 18.893c-.514-.7-.747-1.26-.747-1.906V3.528c0-.84.374-1.54 1.508-1.746z" />
            </svg>
            {notionStatus === "sending"
              ? "Sending..."
              : notionStatus === "done"
                ? "Sent!"
                : notionStatus === "error"
                  ? "Failed"
                  : "Notion"}
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

          {/* Publish */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {publishing ? "Publishing..." : publishedUrl ? "Republish" : "Publish"}
              </button>
              {urlCopied && (
                <span className="text-xs text-green-600 font-medium">
                  Link copied!
                </span>
              )}
            </div>
            {publishedUrl && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500 truncate flex-1 font-mono">
                  {publishedUrl}
                </p>
                <button
                  onClick={handleCopyUrl}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showNotionModal && (
        <NotionModal
          onDone={exportToNotion}
          onCancel={() => setShowNotionModal(false)}
        />
      )}
    </div>
  );
}
