import { useState } from "react";

const NOTION_TOKEN_KEY = "whatsapp-summarizer-notion-token";
const NOTION_PAGE_KEY = "whatsapp-summarizer-notion-page";

export function getNotionSettings(): {
  token: string;
  pageId: string;
} | null {
  const token = localStorage.getItem(NOTION_TOKEN_KEY);
  const pageId = localStorage.getItem(NOTION_PAGE_KEY);
  if (token && pageId) return { token, pageId };
  return null;
}

function extractPageId(input: string): string | null {
  // Accept raw 32-char hex ID or full Notion URL
  const hex = input.replace(/-/g, "");
  const match = hex.match(/([a-f0-9]{32})(?:\?|$)/i) ?? hex.match(/([a-f0-9]{32})$/i);
  return match ? match[1] : null;
}

interface NotionModalProps {
  onDone: (settings: { token: string; pageId: string }) => void;
  onCancel: () => void;
}

export default function NotionModal({ onDone, onCancel }: NotionModalProps) {
  const existing = getNotionSettings();
  const [token, setToken] = useState(existing?.token ?? "");
  const [pageUrl, setPageUrl] = useState(
    existing?.pageId
      ? `https://www.notion.so/${existing.pageId}`
      : ""
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = token.trim();
    const pageId = extractPageId(pageUrl.trim());

    if (!trimmedToken) {
      setError("Please enter your Notion integration token.");
      return;
    }
    if (!pageId) {
      setError("Could not extract a page ID from the URL. Paste the full Notion page URL.");
      return;
    }

    localStorage.setItem(NOTION_TOKEN_KEY, trimmedToken);
    localStorage.setItem(NOTION_PAGE_KEY, pageId);
    onDone({ token: trimmedToken, pageId });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Notion Settings
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Create an{" "}
          <a
            href="https://www.notion.so/profile/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline"
          >
            internal integration
          </a>
          , then share your target page with it via the "..." menu &rarr;
          "Connections".
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Integration Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              placeholder="ntn_..."
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Page URL
            </label>
            <input
              type="text"
              value={pageUrl}
              onChange={(e) => {
                setPageUrl(e.target.value);
                setError("");
              }}
              placeholder="https://www.notion.so/Your-Page-abc123..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Save & Export
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
