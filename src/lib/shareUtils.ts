import type { SummaryResult } from "./summarize";

export interface SharedData {
  dateRange: string;
  messageCount: number;
  memberCount: number;
  summary: SummaryResult;
  topContributors: { name: string; count: number }[];
}

const BLOB_ID_KEY = "whatsapp-summarizer-blob-id";
const PUBLISHED_URL_KEY = "whatsapp-summarizer-published-url";

// Keep for backward-compat with old inline-data share links
function decodeShareData(encoded: string): SharedData | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function publishSummary(data: SharedData): Promise<string> {
  const existingBlobId = localStorage.getItem(BLOB_ID_KEY);
  const existingUrl = localStorage.getItem(PUBLISHED_URL_KEY);

  // If we already have a blob, just update it — URL stays the same
  if (existingBlobId && existingUrl) {
    const resp = await fetch(`/api/blob?id=${existingBlobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (resp.ok) return existingUrl;
    // If update fails (e.g. blob expired), fall through to create new
  }

  // Create a new blob
  const createResp = await fetch("/api/blob", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!createResp.ok) throw new Error("Failed to publish summary");
  const { blobId } = await createResp.json();

  const shareUrl = `${window.location.origin}${window.location.pathname}?share=${blobId}`;

  // Try to shorten
  let finalUrl = shareUrl;
  try {
    const shortenResp = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: shareUrl }),
    });
    if (shortenResp.ok) {
      const { shortUrl } = await shortenResp.json();
      if (shortUrl?.startsWith("http")) finalUrl = shortUrl;
    }
  } catch {
    // Shortening failed — use full URL
  }

  localStorage.setItem(BLOB_ID_KEY, blobId);
  localStorage.setItem(PUBLISHED_URL_KEY, finalUrl);
  return finalUrl;
}

export function getPublishedUrl(): string | null {
  return localStorage.getItem(PUBLISHED_URL_KEY);
}

export async function fetchSharedData(blobId: string): Promise<SharedData> {
  const resp = await fetch(`/api/blob?id=${blobId}`);
  if (!resp.ok) throw new Error("Share not found");
  return resp.json();
}

export type ShareParseResult =
  | { type: "blob"; blobId: string }
  | { type: "inline"; data: SharedData }
  | null;

export function parseShareParam(): ShareParseResult {
  // Current format: ?share=<blobId>
  const params = new URLSearchParams(window.location.search);
  const blobId = params.get("share");
  if (blobId) {
    return { type: "blob", blobId };
  }

  // Legacy format: #/share/<base64-encoded-data>
  const hash = window.location.hash;
  if (hash.startsWith("#/share/")) {
    const payload = hash.slice("#/share/".length);
    if (/^\d+$/.test(payload)) {
      return { type: "blob", blobId: payload };
    }
    const decoded = decodeShareData(payload);
    if (decoded) return { type: "inline", data: decoded };
  }

  return null;
}
