import { ItineraryEvent, TravelLink } from '@/types/project';

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
  'check-in': 'Check-In',
  'check-out': 'Check-Out',
  'accommodation': 'Accommodation',
  'activity': 'Activity',
  'transfer': 'Transfer',
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Try parsing as YYYY-MM-DD first
    const parts = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (parts) {
      const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year} (${days[d.getDay()]})`;
    }
    // Fallback: try native Date parsing for free-text dates like "March 15, 2026"
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Can't parse, return as-is
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year} (${days[d.getDay()]})`;
  } catch {
    return dateStr;
  }
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

export function buildEventTable(event: ItineraryEvent): EventTableData {
  const rows: EventRow[] = [];

  // Date
  if (event.type === 'accommodation' && event.endDate) {
    rows.push({ field: 'Date', details: `${formatDate(event.date)} – ${formatDate(event.endDate)}` });
  } else {
    rows.push({ field: 'Date', details: formatDate(event.date) });
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
  event: ItineraryEvent;
  displayType: string;
  displayDate: string;
  displayTime?: string;
  isBookend?: 'check-in' | 'check-out';
}

export function buildTimeline(events: ItineraryEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const ev of events) {
    if (ev.type === 'accommodation') {
      // Expand into check-in and check-out bookends
      entries.push({
        event: ev, displayType: 'check-in', displayDate: ev.date,
        displayTime: ev.time || '15:00', isBookend: 'check-in',
      });
      if (ev.endDate && ev.endDate !== ev.date) {
        entries.push({
          event: ev, displayType: 'check-out', displayDate: ev.endDate,
          displayTime: '11:00', isBookend: 'check-out',
        });
      }
    } else if (ev.type === 'check-in') {
      // Legacy type — treat as accommodation check-in bookend (don't duplicate)
      entries.push({
        event: ev, displayType: 'check-in', displayDate: ev.date,
        displayTime: ev.time || '15:00', isBookend: 'check-in',
      });
    } else if (ev.type === 'check-out') {
      // Legacy type — treat as accommodation check-out bookend (don't duplicate)
      entries.push({
        event: ev, displayType: 'check-out', displayDate: ev.date,
        displayTime: ev.time || '11:00', isBookend: 'check-out',
      });
    } else if (ev.type === 'flight') {
      entries.push({ event: ev, displayType: 'flight', displayDate: ev.date, displayTime: ev.departureTime });
    } else {
      entries.push({ event: ev, displayType: ev.type, displayDate: ev.date, displayTime: ev.time });
    }
  }
  entries.sort((a, b) =>
    `${a.displayDate}${a.displayTime || ''}`.localeCompare(`${b.displayDate}${b.displayTime || ''}`)
  );
  return entries;
}
