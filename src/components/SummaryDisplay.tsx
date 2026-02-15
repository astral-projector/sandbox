import { useState } from "react";
import type { SummaryResult } from "../lib/summarize";

interface SummaryDisplayProps {
  summary: SummaryResult | null;
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

export default function SummaryDisplay({
  summary,
  isLoading,
  error,
  fromDate,
  toDate,
  messageCount,
  memberCount,
  topContributors,
}: SummaryDisplayProps) {
  const [expanded, setExpanded] = useState(true);

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
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="px-6 py-5 space-y-5">
          {/* Summary paragraph */}
          {summary.summary && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Summary
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary.summary}
              </p>
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
                    className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full"
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
                  <li key={i} className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">
                      {insight.label}:
                    </span>{" "}
                    {insight.text}
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
