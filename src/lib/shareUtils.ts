import type { SummaryResult } from "./summarize";

export interface SharedData {
  dateRange: string;
  messageCount: number;
  memberCount: number;
  summary: SummaryResult;
  topContributors: { name: string; count: number }[];
}

const PUBLISHED_KEY = "whatsapp-summarizer-published-url";

export function encodeShareData(data: SharedData): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareData(encoded: string): SharedData | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildFullUrl(data: SharedData): string {
  const encoded = encodeShareData(data);
  return `${window.location.origin}${window.location.pathname}#/share/${encoded}`;
}

export async function publishSummary(data: SharedData): Promise<string> {
  const fullUrl = buildFullUrl(data);

  // Try to shorten with TinyURL
  try {
    const resp = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(fullUrl)}`
    );
    if (resp.ok) {
      const shortUrl = await resp.text();
      if (shortUrl.startsWith("http")) {
        localStorage.setItem(PUBLISHED_KEY, shortUrl);
        return shortUrl;
      }
    }
  } catch {
    // CORS or network error — fall through to full URL
  }

  // Fallback: use the full URL directly
  localStorage.setItem(PUBLISHED_KEY, fullUrl);
  return fullUrl;
}

export function getPublishedUrl(): string | null {
  return localStorage.getItem(PUBLISHED_KEY);
}

export function parseShareHash(): SharedData | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#/share/")) return null;
  const encoded = hash.slice("#/share/".length);
  return decodeShareData(encoded);
}
