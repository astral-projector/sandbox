import { toInputDateString, fromInputDateString } from "../lib/whatsappParser";

interface DateRangeSelectorProps {
  from: Date;
  to: Date;
  onFromChange: (date: Date) => void;
  onToChange: (date: Date) => void;
  onLastWeek: () => void;
  onGenerate: () => void;
  filteredCount: number;
  isLoading: boolean;
}

export default function DateRangeSelector({
  from,
  to,
  onFromChange,
  onToChange,
  onLastWeek,
  onGenerate,
  filteredCount,
  isLoading,
}: DateRangeSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Date Range</h2>

      <div className="flex flex-wrap items-end gap-3">
        <button
          onClick={onLastWeek}
          className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Last week
        </button>

        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={toInputDateString(from)}
              onChange={(e) => onFromChange(fromInputDateString(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={toInputDateString(to)}
              onChange={(e) => onToChange(fromInputDateString(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isLoading || filteredCount === 0}
          className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
        >
          {isLoading ? "Generating..." : "Go"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {filteredCount === 0 ? (
          <span className="text-amber-600">
            No messages found in this range. Try a different date range.
          </span>
        ) : (
          <span>{filteredCount} messages in selected range</span>
        )}
      </p>
    </div>
  );
}
