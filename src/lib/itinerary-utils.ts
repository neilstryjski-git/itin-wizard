import { ItineraryEvent, TravelLink } from '@/types/project';

export const EVENT_EMOJI: Record<string, string> = {
  'flight-departure': '✈',
  'flight-arrival': '✈',
  'check-in': '🏡',
  'check-out': '🏡',
  'accommodation': '🏡',
  'activity': '📍',
  'transfer': '🚗',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  'flight-departure': 'Flight Departure',
  'flight-arrival': 'Flight Arrival',
  'check-in': 'Check-In',
  'check-out': 'Check-Out',
  'accommodation': 'Accommodation',
  'activity': 'Activity',
  'transfer': 'Transfer',
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  notes: string;
}

export function buildEventRows(event: ItineraryEvent): EventRow[] {
  const rows: EventRow[] = [];

  // Date
  if (event.type === 'accommodation' && event.endDate) {
    const notes = event.links.length > 0 ? event.links.map(l => `• ${l.label}`).join('\n') : '';
    rows.push({ field: 'Date', details: `${formatDate(event.date)} – ${formatDate(event.endDate)}`, notes });
  } else {
    const notes = event.links.length > 0 ? event.links.map(l => `• ${l.label}`).join('\n') : '';
    rows.push({ field: 'Date', details: formatDate(event.date), notes });
  }

  // Time
  if (event.time) {
    let timeStr = '';
    if (event.type === 'accommodation') timeStr = `Check-in after ${formatTime(event.time)}`;
    else if (event.type === 'flight-departure') timeStr = `Departure at ${formatTime(event.time)}`;
    else if (event.type === 'flight-arrival') timeStr = `Arrival at ${formatTime(event.time)}`;
    else timeStr = formatTime(event.time);
    rows.push({ field: 'Time', details: timeStr, notes: '' });
  }

  // Location
  if (event.location || event.address) {
    rows.push({ field: 'Location', details: [event.location, event.address].filter(Boolean).join(', '), notes: '' });
  }

  // Details
  if (event.notes || event.flightNumber) {
    rows.push({ field: 'Details', details: [event.flightNumber, event.notes].filter(Boolean).join('. '), notes: '' });
  }

  // Confirmation
  if (event.confirmationCode) {
    rows.push({ field: 'Confirmation', details: event.confirmationCode, notes: '' });
  }

  // Attachments
  if (event.attachments && event.attachments.length > 0) {
    rows.push({ field: 'Attachments', details: event.attachments.map(a => `• ${a.name}`).join('\n'), notes: '' });
  }

  return rows;
}

export function getEventTitle(event: ItineraryEvent): string {
  const emoji = EVENT_EMOJI[event.type] || '📍';
  return `${emoji} ${event.title}`;
}
