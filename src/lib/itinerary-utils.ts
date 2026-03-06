import { parse, format, isValid } from 'date-fns';
import { ItineraryEvent, TravelLink } from '@/types/project';

/**
 * Normalize any date string to YYYY-MM-DD for reliable sorting.
 * Handles ISO, DD/MM/YYYY, MM/DD/YYYY, DD/MM/YY, free-text, etc.
 */
export function normalizeDate(value: string | undefined | null): string {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();

  // ISO datetime strings like "2026-03-15T00:00:00.000Z" — extract date part
  const isoDateTimeMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/);
  if (isoDateTimeMatch) {
    return `${isoDateTimeMatch[1]}-${isoDateTimeMatch[2].padStart(2, '0')}-${isoDateTimeMatch[3].padStart(2, '0')}`;
  }

  // Already YYYY-MM-DD (possibly with single-digit month/day like 2026-3-1)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // Try date-fns parsing with common formats
  const formats = [
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'dd/MM/yy',
    'MM/dd/yy',
    'yyyy/MM/dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'MMMM d, yyyy',
    'MMM d, yyyy',
  ];
  for (const fmt of formats) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1000) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  // Fallback: native Date parsing (handles "March 15, 2026" etc.)
  // Use local date components to avoid UTC→local timezone shift
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1000) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return trimmed; // Can't parse, return as-is
}

export const EVENT_EMOJI: Record<string, string> = {
  'flight': '✈',
  'check-in': '🏡',
  'check-out': '🏡',
  'accommodation': '🏡',
  'activity': '📍',
  'transfer': '🚗',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  'flight': 'Flight',
  'check-in': 'Accommodation Check-In',
  'check-out': 'Accommodation Check-Out',
  'accommodation': 'Accommodation (Stay)',
  'activity': 'Activity',
  'transfer': 'Transfer',
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Normalize first to ensure consistent YYYY-MM-DD
    const normalized = normalizeDate(dateStr);
    const parts = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year} (${days[d.getDay()]})`;
    }
    return dateStr; // Can't parse, return as-is
  } catch {
    return dateStr;
  }
}

export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function formatTime(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export interface EventRow {
  field: string;
  details: string;
}

export interface EventTableData {
  rows: EventRow[];
  notes: string; // Combined notes string for PDF
  noteItems: string[]; // Individual note items for HTML rendering
}

export function buildEventTable(event: ItineraryEvent, bookend?: 'check-in' | 'check-out'): EventTableData {
  const rows: EventRow[] = [];
  const isCheckOut = bookend === 'check-out';

  // Date
  if (isCheckOut) {
    rows.push({ field: 'Date', details: formatDate(event.endDate || event.date) });
  } else if (event.type === 'accommodation' && event.endDate) {
    rows.push({ field: 'Date', details: `${formatDate(event.date)} – ${formatDate(event.endDate)}` });
  } else {
    rows.push({ field: 'Date', details: formatDate(event.date) });
  }

  // For check-out bookends, only show time — skip location, details, confirmation
  if (isCheckOut) {
    rows.push({ field: 'Time', details: `Check-out by 11:00 AM` });
    const noteItems: string[] = [];
    const notes = noteItems.map(n => `• ${n}`).join('\n');
    return { rows, notes, noteItems };
  }

  // Flight-specific: departure and arrival
  if (event.type === 'flight') {
    const depParts = [event.departureLocation, event.departureTime ? `at ${formatTime(event.departureTime)}` : ''].filter(Boolean);
    const arrParts = [event.arrivalLocation, event.arrivalTime ? `at ${formatTime(event.arrivalTime)}` : ''].filter(Boolean);
    if (depParts.length > 0) rows.push({ field: 'Departure', details: depParts.join(' · ') });
    if (arrParts.length > 0) rows.push({ field: 'Arrival', details: arrParts.join(' · ') });
  } else {
    if (event.time) {
      const timeStr = event.type === 'accommodation' ? `Check-in after ${formatTime(event.time)}` : formatTime(event.time);
      rows.push({ field: 'Time', details: timeStr });
    }
  }

  // Location (non-flight)
  if (event.type !== 'flight' && (event.location || event.address)) {
    rows.push({ field: 'Location', details: [event.location, event.address].filter(Boolean).join(', ') });
  }

  // Details
  if (event.notes || event.flightNumber) {
    rows.push({ field: 'Details', details: [event.flightNumber ? `Flight ${event.flightNumber}` : '', event.notes].filter(Boolean).join('. ') });
  }

  // Confirmation
  if (event.confirmationCode) {
    rows.push({ field: 'Confirmation', details: event.confirmationCode });
  }

  // Build combined notes
  const noteItems: string[] = [];
  if (event.links.length > 0) noteItems.push(...event.links.map(l => l.url ? `🔗 ${l.label}` : l.label));
  if (event.attachments && event.attachments.length > 0) noteItems.push(...event.attachments.map(a => `📎 ${a.name}`));
  const notes = noteItems.map(n => `• ${n}`).join('\n');

  return { rows, notes, noteItems };
}

/** @deprecated Use buildEventTable instead */
export function buildEventRows(event: ItineraryEvent): (EventRow & { notes: string })[] {
  const table = buildEventTable(event);
  return table.rows.map((r, i) => ({ ...r, notes: i === 0 ? table.notes : '' }));
}

export function getEventTitle(event: ItineraryEvent): string {
  const emoji = EVENT_EMOJI[event.type] || '📍';
  return `${emoji} ${event.title}`;
}

/** PDF-safe event title (no emoji — jsPDF can't render them) */
const PDF_TYPE_PREFIX: Record<string, string> = {
  'flight': '[Flight]',
  'check-in': '[Accommodation Check-In]',
  'check-out': '[Accommodation Check-Out]',
  'accommodation': '[Accommodation (Stay)]',
  'activity': '[Activity]',
  'transfer': '[Transfer]',
};

export function getEventTitlePdf(event: ItineraryEvent): string {
  const prefix = PDF_TYPE_PREFIX[event.type] || '';
  return `${prefix} ${event.title}`;
}

/** Strip emoji from a string for PDF-safe output */
export function stripEmoji(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[✈🏡📍🚗🔗📎📝📋🧳✓☐]/gu, '').trim();
}

/**
 * Returns the effective sort key for an event.
 * For flights, uses departureTime; for others, uses time.
 */
export function getEventSortKey(event: ItineraryEvent): string {
  const time = event.type === 'flight' ? (event.departureTime || '') : (event.time || '');
  return `${event.date}${time}`;
}

/**
 * Expand accommodation events into check-in/check-out bookends and sort
 * all entries chronologically for timeline display.
 */
export interface TimelineEntry {
  entryId: string;
  event: ItineraryEvent;
  displayType: string;
  displayDate: string;
  displayTime?: string;
  isBookend?: 'check-in' | 'check-out';
}

export function buildTimeline(events: ItineraryEvent[], options?: { preserveOrder?: boolean }): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const ev of events) {
    // Normalize dates for reliable sorting
    const normDate = normalizeDate(ev.date);
    const normEndDate = normalizeDate(ev.endDate);

    if (ev.type === 'accommodation') {
      entries.push({
        entryId: `${ev.id}::check-in`, event: ev, displayType: 'check-in', displayDate: normDate,
        displayTime: ev.time || '15:00', isBookend: 'check-in',
      });
      if (normEndDate && normEndDate !== normDate) {
        entries.push({
          entryId: `${ev.id}::check-out`, event: ev, displayType: 'check-out', displayDate: normEndDate,
          displayTime: '11:00', isBookend: 'check-out',
        });
      }
    } else if (ev.type === 'check-in') {
      entries.push({
        entryId: ev.id, event: ev, displayType: 'check-in', displayDate: normDate,
        displayTime: ev.time || '15:00', isBookend: 'check-in',
      });
    } else if (ev.type === 'check-out') {
      entries.push({
        entryId: ev.id, event: ev, displayType: 'check-out', displayDate: normDate,
        displayTime: ev.time || '11:00', isBookend: 'check-out',
      });
    } else if (ev.type === 'flight') {
      entries.push({ entryId: ev.id, event: ev, displayType: 'flight', displayDate: normDate, displayTime: ev.departureTime });
    } else {
      entries.push({ entryId: ev.id, event: ev, displayType: ev.type, displayDate: normDate, displayTime: ev.time });
    }
  }

  // When preserveOrder is true, keep the input array order (still expanding accommodations inline)
  if (options?.preserveOrder) {
    return entries;
  }

  // Sort chronologically using numeric Date comparison (not string)
  const parseToTimestamp = (dateStr: string, timeStr?: string): number => {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return 0; // unparseable dates sort to top
    const hours = timeStr ? parseInt(timeStr.split(':')[0] || '12', 10) : 12;
    const mins = timeStr ? parseInt(timeStr.split(':')[1] || '0', 10) : 0;
    return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), hours, mins).getTime();
  };

  entries.sort((a, b) => {
    const tsA = parseToTimestamp(a.displayDate, a.displayTime);
    const tsB = parseToTimestamp(b.displayDate, b.displayTime);
    if (tsA !== tsB) return tsA - tsB;
    // Tie-break: check-in before other events, check-out after
    const priority = (e: TimelineEntry) =>
      e.isBookend === 'check-in' ? 0 : e.isBookend === 'check-out' ? 2 : 1;
    return priority(a) - priority(b);
  });

  return entries;
}

/**
 * Given a reordered timeline (by entryId), reconstruct the deduplicated
 * events array preserving the new visual order.
 * If an accommodation event has been interleaved (e.g. Activity between Check-In and Check-Out),
 * it is split into separate check-in and check-out events.
 */
export function eventsFromTimeline(entries: TimelineEntry[]): ItineraryEvent[] {
  const result: ItineraryEvent[] = [];
  const processed = new Map<string, { checkInAt: number; hasOut: boolean }>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const event = { ...entry.event };
    const eventId = event.id;

    if (event.type === 'accommodation') {
      const state = processed.get(eventId);

      if (!state) {
        // First time seeing this accommodation event
        if (entry.isBookend === 'check-out') {
          // Rare: Moved check-out before check-in or it's the only one.
          // Convert to standalone check-out.
          event.type = 'check-out';
          event.date = event.endDate || event.date;
          event.endDate = undefined;
          result.push(event);
        } else {
          // This is the check-in (or first entry).
          // Keep it as accommodation for now, but mark its position.
          processed.set(eventId, { checkInAt: result.length, hasOut: false });
          result.push(event);
        }
      } else {
        // We've seen the check-in already.
        const isInterleaved = state.checkInAt !== result.length - 1;

        if (isInterleaved) {
          // Something was put between Check-In and this entry (likely Check-Out).
          // Split into separate events.
          const checkInEvent = result[state.checkInAt];
          checkInEvent.type = 'check-in';
          checkInEvent.endDate = undefined;
          
          // Current entry becomes a standalone check-out
          event.id = `${eventId}::split-out`; // Unique ID to avoid collision
          event.type = 'check-out';
          event.date = event.endDate || event.date;
          event.endDate = undefined;
          result.push(event);
        } else {
          // Not interleaved yet (Check-Out is right after Check-In).
          // We can keep it as a single 'accommodation' event.
          state.hasOut = true;
        }
      }
    } else {
      // Normal event
      result.push(event);
    }
  }

  return result;
}
