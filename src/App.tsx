import { useState, useMemo, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import DateRangeSelector from "./components/DateRangeSelector";
import ApiKeyModal from "./components/ApiKeyModal";
import SummaryDisplay from "./components/SummaryDisplay";
import SharedView from "./components/SharedView";
import { parseShareHash, getSavedLinks, deleteSharedLink, type SharedLink } from "./lib/shareUtils";
import {
  parseWhatsAppChat,
  filterMessagesByDateRange,
  getLastWeekRange,
  formatDate,
  type ParseResult,
} from "./lib/whatsappParser";
import { generateSummary, computeTopContributors, type SummaryResult } from "./lib/summarize";

function MainApp() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulletCount, setBulletCount] = useState(5);
  const [sentenceCount, setSentenceCount] = useState(3);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>(() => getSavedLinks());

  const refreshSharedLinks = useCallback(() => {
    setSharedLinks(getSavedLinks());
  }, []);

  const handleDeleteLink = useCallback((id: string) => {
    deleteSharedLink(id);
    refreshSharedLinks();
  }, [refreshSharedLinks]);

  const filteredMessages = useMemo(() => {
    if (!parseResult) return [];
    return filterMessagesByDateRange(parseResult.messages, fromDate, toDate);
  }, [parseResult, fromDate, toDate]);

  const topContributors = useMemo(
    () => computeTopContributors(filteredMessages),
    [filteredMessages]
  );

  const memberCount = topContributors.length;

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
      const result = await generateSummary(apiKey, filteredMessages, bulletCount, sentenceCount);
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
  }, [apiKey, filteredMessages, bulletCount, sentenceCount]);

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
            bulletCount={bulletCount}
            onBulletCountChange={setBulletCount}
            sentenceCount={sentenceCount}
            onSentenceCountChange={setSentenceCount}
          />
        )}

        {/* Summary Output */}
        <SummaryDisplay
          summary={summary}
          onSummaryChange={setSummary}
          isLoading={isLoading}
          error={error}
          fromDate={fromDate}
          toDate={toDate}
          messageCount={filteredMessages.length}
          memberCount={memberCount}
          topContributors={topContributors}
          onLinkShared={refreshSharedLinks}
        />

        {/* Shared Links */}
        {sharedLinks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Shared Links</h2>
            <ul className="space-y-2">
              {sharedLinks.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 text-xs group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-700 truncate">
                      {link.dateRange}
                    </p>
                    <p className="text-gray-400 truncate">{link.url}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1"
                    title="Delete shared link"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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

function App() {
  const parsed = parseShareHash();
  if (parsed) {
    return <SharedView id={parsed.id} data={parsed.data} />;
  }
  return <MainApp />;
}

export default App;
