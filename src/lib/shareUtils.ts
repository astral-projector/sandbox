import type { SummaryResult } from "./summarize";

export interface SharedData {
  dateRange: string;
  messageCount: number;
  memberCount: number;
  summary: SummaryResult;
  topContributors: { name: string; count: number }[];
}

export interface SharedLink {
  id: string;
  url: string;
  dateRange: string;
  createdAt: string;
}

const LINKS_KEY = "whatsapp-summarizer-shared-links";
const REVOKED_KEY = "whatsapp-summarizer-revoked-links";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
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
  const id = generateId();
  const encoded = encodeShareData(data);
  const url = `${window.location.origin}${window.location.pathname}#/share/${id}/${encoded}`;

  // Save to local link history
  const links = getSavedLinks();
  links.push({ id, url, dateRange: data.dateRange, createdAt: new Date().toISOString() });
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));

  return url;
}

export function parseShareHash(): { id: string; data: SharedData } | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#/share/")) return null;
  const rest = hash.slice("#/share/".length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) return null;
  const id = rest.slice(0, slashIdx);
  const encoded = rest.slice(slashIdx + 1);
  const data = decodeShareData(encoded);
  if (!data) return null;
  return { id, data };
}

export function getSavedLinks(): SharedLink[] {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSharedLink(id: string): void {
  // Remove from saved links
  const links = getSavedLinks().filter((l) => l.id !== id);
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));

  // Add to revoked set
  const revoked = getRevokedIds();
  revoked.add(id);
  localStorage.setItem(REVOKED_KEY, JSON.stringify([...revoked]));
}

export function isLinkRevoked(id: string): boolean {
  return getRevokedIds().has(id);
}

function getRevokedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REVOKED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
