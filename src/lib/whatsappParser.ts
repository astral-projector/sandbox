export interface ChatMessage {
  timestamp: Date;
  sender: string;
  content: string;
}

export interface ParseResult {
  messages: ChatMessage[];
  earliestDate: Date;
  latestDate: Date;
}

// System message patterns to filter out
const SYSTEM_PATTERNS = [
  /^messages and calls are end-to-end encrypted/i,
  /^this message was deleted$/i,
  /^you deleted this message$/i,
  /^<media omitted>$/i,
  /^image omitted$/i,
  /^video omitted$/i,
  /^audio omitted$/i,
  /^sticker omitted$/i,
  /^document omitted$/i,
  /^GIF omitted$/i,
  /^Contact card omitted$/i,
  /joined using this group's invite link$/i,
  /changed the group description$/i,
  /changed the subject from/i,
  /changed this group's icon$/i,
  /changed the group name/i,
  /was added$/i,
  /was removed$/i,
  /left$/i,
  /created group/i,
  /changed their phone number/i,
  /your security code with .* changed/i,
  /^\u200e/,  // Messages starting with left-to-right mark (system messages)
  /^waiting for this message/i,
  /missed voice call$/i,
  /missed video call$/i,
  /^null$/i,
  /changed the settings/i,
  /pinned a message$/i,
  /unpinned a message$/i,
  /turned on disappearing messages/i,
  /turned off disappearing messages/i,
];

function isSystemMessage(content: string): boolean {
  const trimmed = content.trim();
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Regex patterns matching WhatsApp timestamp + sender line beginnings.
 *
 * Format families:
 *   1. Bracket format:  [M/D/YY, H:MM:SS AM] Sender:
 *   2. Dash format:     M/D/YY, HH:MM - Sender:
 *   3. Dash format (DD/MM/YYYY): 15/01/2023, 2:30 pm - Sender:
 *
 * We capture: dateStr, timeStr, ampm (optional), sender, messageStart
 */

// Date part: supports /, ., and - as separators
// Handles: 1/15/23, 15.01.23, 15-01-2023, 2025/3/30 (year-first)
const DATE_PART = String.raw`(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4})`;
const TIME_PART = String.raw`(\d{1,2}:\d{2}(?::\d{2})?)`;
const AMPM_PART = String.raw`(AM|PM|am|pm|a\.m\.|p\.m\.)?`;

// Bracket format: [1/15/23, 2:30:15 PM] John: message
// Also handles [15.01.23, 14:30:15] John: message
const BRACKET_RE = new RegExp(
  String.raw`^\[${DATE_PART},\s*${TIME_PART}\s*${AMPM_PART}\]\s*([^:]+):\s*(.*)`
);

// Dash format: 1/15/23, 14:30 - John: message
// Also handles: 15.01.2023, 2:30 pm - John: message
const DASH_RE = new RegExp(
  String.raw`^${DATE_PART},\s*${TIME_PART}\s*${AMPM_PART}\s*-\s*([^:]+):\s*(.*)`
);

// Dash format for system messages (no sender/colon):
// 1/15/23, 14:30 - Messages and calls are end-to-end encrypted...
const DASH_SYSTEM_RE = new RegExp(
  String.raw`^${DATE_PART},\s*${TIME_PART}\s*${AMPM_PART}\s*-\s*(.*)`
);

// Bracket format for system messages (no sender/colon):
const BRACKET_SYSTEM_RE = new RegExp(
  String.raw`^\[${DATE_PART},\s*${TIME_PART}\s*${AMPM_PART}\]\s*(.*)`
);

interface LineMatch {
  dateStr: string;
  timeStr: string;
  ampm: string | undefined;
  sender: string | null;
  content: string;
}

function matchLine(line: string): LineMatch | null {
  // Try bracket format with sender first
  let m = BRACKET_RE.exec(line);
  if (m) {
    return {
      dateStr: m[1],
      timeStr: m[2],
      ampm: m[3] || undefined,
      sender: m[4].trim(),
      content: m[5],
    };
  }

  // Try dash format with sender
  m = DASH_RE.exec(line);
  if (m) {
    return {
      dateStr: m[1],
      timeStr: m[2],
      ampm: m[3] || undefined,
      sender: m[4].trim(),
      content: m[5],
    };
  }

  // Try system message formats (no sender)
  m = DASH_SYSTEM_RE.exec(line);
  if (m) {
    return {
      dateStr: m[1],
      timeStr: m[2],
      ampm: m[3] || undefined,
      sender: null,
      content: m[4],
    };
  }

  m = BRACKET_SYSTEM_RE.exec(line);
  if (m) {
    return {
      dateStr: m[1],
      timeStr: m[2],
      ampm: m[3] || undefined,
      sender: null,
      content: m[4],
    };
  }

  return null;
}

/**
 * Parse a date string along with time and optional AM/PM.
 *
 * Supported formats (heuristic):
 *   - YYYY/M/D  → first part has 4 digits (year-first)
 *   - DD/MM/YYYY → last part has 4 digits (day-first, intl)
 *   - M/D/YY    → everything else (US default)
 */
function parseDateTime(
  dateStr: string,
  timeStr: string,
  ampm: string | undefined
): Date {
  const parts = dateStr.split(/[\/.\-]/);
  const dateParts = parts.map(Number);
  let month: number, day: number, year: number;

  if (parts[0].length === 4) {
    // YYYY/M/D (year-first)
    year = dateParts[0];
    month = dateParts[1] - 1; // JS months are 0-indexed
    day = dateParts[2];
  } else if (parts[2].length === 4) {
    // DD/MM/YYYY (day-first, intl)
    day = dateParts[0];
    month = dateParts[1] - 1;
    year = dateParts[2];
  } else {
    // M/D/YY (US format)
    month = dateParts[0] - 1;
    day = dateParts[1];
    year = dateParts[2];
    if (year < 100) {
      year += 2000;
    }
  }

  const timeParts = timeStr.split(":").map(Number);
  let hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2] || 0;

  if (ampm) {
    const normalized = ampm.replace(/\./g, "").toLowerCase();
    if (normalized === "pm" && hours !== 12) {
      hours += 12;
    } else if (normalized === "am" && hours === 12) {
      hours = 0;
    }
  }

  return new Date(year, month, day, hours, minutes, seconds);
}

export function parseWhatsAppChat(text: string): ParseResult {
  // Strip BOM and Unicode directional markers that WhatsApp exports include
  const cleaned = text.replace(/[\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  const lines = cleaned.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  let currentMessage: ChatMessage | null = null;

  for (const line of lines) {
    const match = matchLine(line);

    if (match) {
      // Flush previous message
      if (currentMessage) {
        if (!isSystemMessage(currentMessage.content)) {
          messages.push(currentMessage);
        }
      }

      if (match.sender === null) {
        // System message line — set currentMessage so continuations are absorbed,
        // but it will be filtered out when flushed.
        currentMessage = {
          timestamp: parseDateTime(match.dateStr, match.timeStr, match.ampm),
          sender: "__system__",
          content: match.content,
        };
      } else {
        currentMessage = {
          timestamp: parseDateTime(match.dateStr, match.timeStr, match.ampm),
          sender: match.sender,
          content: match.content,
        };
      }
    } else {
      // Continuation line — append to current message
      if (currentMessage && line.trim() !== "") {
        currentMessage.content += "\n" + line;
      }
    }
  }

  // Flush last message
  if (currentMessage && currentMessage.sender !== "__system__" && !isSystemMessage(currentMessage.content)) {
    messages.push(currentMessage);
  }

  if (messages.length === 0) {
    return {
      messages: [],
      earliestDate: new Date(),
      latestDate: new Date(),
    };
  }

  const earliestDate = messages[0].timestamp;
  const latestDate = messages[messages.length - 1].timestamp;

  return { messages, earliestDate, latestDate };
}

export function filterMessagesByDateRange(
  messages: ChatMessage[],
  from: Date,
  to: Date
): ChatMessage[] {
  const startOfDay = new Date(from);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(to);
  endOfDay.setHours(23, 59, 59, 999);

  return messages.filter(
    (msg) => msg.timestamp >= startOfDay && msg.timestamp <= endOfDay
  );
}

/**
 * Get the "last week" (Monday–Sunday) relative to the latest message date.
 */
export function getLastWeekRange(latestDate: Date): { from: Date; to: Date } {
  const latest = new Date(latestDate);
  // Find the most recent Sunday on or before the latest date
  const dayOfWeek = latest.getDay(); // 0 = Sunday
  const lastSunday = new Date(latest);
  lastSunday.setDate(latest.getDate() - dayOfWeek);
  lastSunday.setHours(0, 0, 0, 0);

  // The Monday of that week
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  return { from: lastMonday, to: lastSunday };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toInputDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromInputDateString(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
