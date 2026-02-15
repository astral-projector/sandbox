import { useState, useMemo, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import DateRangeSelector from "./components/DateRangeSelector";
import ApiKeyModal from "./components/ApiKeyModal";
import SummaryDisplay from "./components/SummaryDisplay";
import {
  parseWhatsAppChat,
  filterMessagesByDateRange,
  getLastWeekRange,
  formatDate,
  type ParseResult,
} from "./lib/whatsappParser";
import { generateSummary } from "./lib/summarize";

function App() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMessages = useMemo(() => {
    if (!parseResult) return [];
    return filterMessagesByDateRange(parseResult.messages, fromDate, toDate);
  }, [parseResult, fromDate, toDate]);

  const handleFileLoaded = useCallback((text: string) => {
    const result = parseWhatsAppChat(text);
    setParseResult(result);
    setSummary(null);
    setError(null);

    if (result.messages.length > 0) {
      const { from, to } = getLastWeekRange(result.latestDate);
      setFromDate(from);
      setToDate(to);
    }
  }, []);

  const handleLastWeek = useCallback(() => {
    if (!parseResult) return;
    const { from, to } = getLastWeekRange(parseResult.latestDate);
    setFromDate(from);
    setToDate(to);
    setSummary(null);
    setError(null);
  }, [parseResult]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (filteredMessages.length === 0) return;

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const result = await generateSummary(apiKey, filteredMessages);
      setSummary(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      if (message.includes("401") || message.includes("authentication")) {
        setError(
          "Invalid API key. Please check your Anthropic API key and try again."
        );
      } else {
        setError(`Failed to generate summary: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, filteredMessages]);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setShowApiKeyModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              WhatsApp Chat Summarizer
            </h1>
            <p className="text-sm text-gray-500">
              Upload a chat export and get an AI-powered summary
            </p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="API Key Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {/* API key status indicator */}
        {apiKey && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            API key set
          </div>
        )}

        {/* File Upload */}
        <FileUpload
          onFileLoaded={handleFileLoaded}
          hasFile={parseResult !== null}
          messageCount={parseResult?.messages.length ?? 0}
        />

        {/* Chat info note */}
        {parseResult && parseResult.messages.length > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Chat spans from {formatDate(parseResult.earliestDate)} to{" "}
            {formatDate(parseResult.latestDate)} &bull;{" "}
            {parseResult.messages.length} messages loaded
          </p>
        )}

        {/* Parse error: file loaded but no messages found */}
        {parseResult && parseResult.messages.length === 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              No messages found in this file
            </p>
            <p className="text-xs text-amber-700">
              The file was read but no WhatsApp messages could be parsed. Make
              sure you're uploading a <strong>.txt</strong> file from WhatsApp's{" "}
              <em>Export chat</em> feature (without media). The file should
              contain lines like:
            </p>
            <pre className="text-xs bg-amber-100 rounded-lg p-3 text-amber-900 overflow-x-auto">
              {"[1/15/23, 2:30 PM] Jane: Hello!\n[2025/3/30, 3:43 PM] Jane: Hello!\n12/01/2023, 14:30 - Jane: Hello!"}
            </pre>
          </div>
        )}

        {/* Date Range Selection */}
        {parseResult && parseResult.messages.length > 0 && (
          <DateRangeSelector
            from={fromDate}
            to={toDate}
            onFromChange={(d) => {
              setFromDate(d);
              setSummary(null);
              setError(null);
            }}
            onToChange={(d) => {
              setToDate(d);
              setSummary(null);
              setError(null);
            }}
            onLastWeek={handleLastWeek}
            onGenerate={handleGenerate}
            filteredCount={filteredMessages.length}
            isLoading={isLoading}
          />
        )}

        {/* Summary Output */}
        <SummaryDisplay
          summary={summary}
          isLoading={isLoading}
          error={error}
        />

        {/* API Key Modal */}
        {showApiKeyModal && (
          <ApiKeyModal
            onSubmit={handleApiKeySubmit}
            onCancel={apiKey ? () => setShowApiKeyModal(false) : undefined}
            currentKey={apiKey}
          />
        )}
      </div>
    </div>
  );
}

export default App;
