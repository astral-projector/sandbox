import type { SummaryResult } from "./summarize";

export interface SharedData {
  dateRange: string;
  messageCount: number;
  memberCount: number;
  summary: SummaryResult;
  topContributors: { name: string; count: number }[];
}

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

export function buildShareUrl(data: SharedData): string {
  const encoded = encodeShareData(data);
  return `${window.location.origin}${window.location.pathname}#/share/${encoded}`;
}

export function getSharedDataFromUrl(): SharedData | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#/share/")) return null;
  const encoded = hash.slice("#/share/".length);
  return decodeShareData(encoded);
}
