import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  formatDate,
  formatTime,
  buildTimeline,
  eventsFromTimeline,
  buildEventTable,
  getEventTitle,
  getEventTitlePdf,
  stripEmoji,
  getEventSortKey,
  googleMapsUrl,
} from './itinerary-utils';
import { ItineraryEvent } from '@/types/project';

// ─── Helper ───────────────────────────────────────────────
function makeEvent(overrides: Partial<ItineraryEvent> = {}): ItineraryEvent {
  return {
    id: crypto.randomUUID(),
    type: 'activity',
    title: 'Test Event',
    date: '2026-03-15',
    links: [],
    ...overrides,
  };
}

// ─── normalizeDate ────────────────────────────────────────
describe('normalizeDate', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeDate(null)).toBe('');
    expect(normalizeDate(undefined)).toBe('');
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate('   ')).toBe('');
  });

  it('handles YYYY-MM-DD', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
  });

  it('handles YYYY-M-D (single-digit month/day)', () => {
    expect(normalizeDate('2026-3-1')).toBe('2026-03-01');
  });

  it('handles ISO datetime strings', () => {
    expect(normalizeDate('2026-03-15T00:00:00.000Z')).toBe('2026-03-15');
    expect(normalizeDate('2026-12-01T14:30:00Z')).toBe('2026-12-01');
  });

  it('handles dd/MM/yyyy', () => {
    expect(normalizeDate('15/03/2026')).toBe('2026-03-15');
  });

  it('handles free-text dates like "March 15, 2026"', () => {
    const result = normalizeDate('March 15, 2026');
    expect(result).toBe('2026-03-15');
  });

  it('handles "Mar 15, 2026"', () => {
    const result = normalizeDate('Mar 15, 2026');
    expect(result).toBe('2026-03-15');
  });

  it('returns original string for unparseable input', () => {
    expect(normalizeDate('not-a-date')).toBe('not-a-date');
  });
});

// ─── formatDate ───────────────────────────────────────────
describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats YYYY-MM-DD to dd/mm/yy (DayName)', () => {
    // 2026-03-15 is a Sunday
    expect(formatDate('2026-03-15')).toBe('15/03/26 (Sunday)');
  });

  it('handles ISO datetime input', () => {
    expect(formatDate('2026-03-15T00:00:00.000Z')).toBe('15/03/26 (Sunday)');
  });
});

// ─── formatTime ───────────────────────────────────────────
describe('formatTime', () => {
  it('returns empty string for undefined', () => {
    expect(formatTime()).toBe('');
    expect(formatTime('')).toBe('');
  });

  it('converts 24h to 12h AM', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
  });

  it('converts 24h to 12h PM', () => {
    expect(formatTime('14:05')).toBe('2:05 PM');
  });

  it('handles midnight', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('handles noon', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });
});

// ─── googleMapsUrl ────────────────────────────────────────
describe('googleMapsUrl', () => {
  it('encodes location', () => {
    expect(googleMapsUrl('Tokyo, Japan')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Tokyo%2C%20Japan'
    );
  });
});

// ─── getEventTitle / getEventTitlePdf ─────────────────────
describe('getEventTitle', () => {
  it('prepends emoji', () => {
    expect(getEventTitle(makeEvent({ type: 'flight', title: 'LAX → NRT' }))).toBe('✈ LAX → NRT');
  });

  it('falls back to 📍 for unknown types', () => {
    expect(getEventTitle(makeEvent({ type: 'activity', title: 'Sightseeing' }))).toBe('📍 Sightseeing');
  });
});

describe('getEventTitlePdf', () => {
  it('uses text prefix instead of emoji', () => {
    expect(getEventTitlePdf(makeEvent({ type: 'flight', title: 'LAX → NRT' }))).toBe('[Flight] LAX → NRT');
  });

  it('uses [Accommodation Check-In] for check-in', () => {
    expect(getEventTitlePdf(makeEvent({ type: 'check-in', title: 'Hotel' }))).toBe('[Accommodation Check-In] Hotel');
  });

  it('uses [Accommodation Check-Out] for check-out', () => {
    expect(getEventTitlePdf(makeEvent({ type: 'check-out', title: 'Hotel' }))).toBe('[Accommodation Check-Out] Hotel');
  });

  it('uses [Accommodation (Stay)] for accommodation', () => {
    expect(getEventTitlePdf(makeEvent({ type: 'accommodation', title: 'Hotel' }))).toBe('[Accommodation (Stay)] Hotel');
  });
});

// ─── stripEmoji ───────────────────────────────────────────
describe('stripEmoji', () => {
  it('strips common emoji', () => {
    expect(stripEmoji('✈ My Flight')).toBe('My Flight');
    expect(stripEmoji('🏡 Hotel ABC')).toBe('Hotel ABC');
  });

  it('leaves plain text alone', () => {
    expect(stripEmoji('No emoji here')).toBe('No emoji here');
  });
});

// ─── getEventSortKey ──────────────────────────────────────
describe('getEventSortKey', () => {
  it('uses departureTime for flights', () => {
    expect(getEventSortKey(makeEvent({ type: 'flight', date: '2026-03-15', departureTime: '08:00' }))).toBe('2026-03-1508:00');
  });

  it('uses time for non-flights', () => {
    expect(getEventSortKey(makeEvent({ date: '2026-03-15', time: '10:00' }))).toBe('2026-03-1510:00');
  });
});

// ─── buildTimeline ────────────────────────────────────────
describe('buildTimeline', () => {
  it('sorts events chronologically (soonest first)', () => {
    const events = [
      makeEvent({ id: 'c', date: '2026-03-17', time: '10:00' }),
      makeEvent({ id: 'a', date: '2026-03-15', time: '09:00' }),
      makeEvent({ id: 'b', date: '2026-03-16', time: '14:00' }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline.map(e => e.event.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts same-day events by time', () => {
    const events = [
      makeEvent({ id: 'late', date: '2026-03-15', time: '18:00' }),
      makeEvent({ id: 'early', date: '2026-03-15', time: '08:00' }),
      makeEvent({ id: 'mid', date: '2026-03-15', time: '12:00' }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline.map(e => e.event.id)).toEqual(['early', 'mid', 'late']);
  });

  it('expands accommodation into check-in and check-out', () => {
    const events = [
      makeEvent({ id: 'hotel', type: 'accommodation', date: '2026-03-15', endDate: '2026-03-17', time: '15:00' }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].isBookend).toBe('check-in');
    expect(timeline[0].displayDate).toBe('2026-03-15');
    expect(timeline[1].isBookend).toBe('check-out');
    expect(timeline[1].displayDate).toBe('2026-03-17');
  });

  it('check-in sorts before other events, check-out sorts after', () => {
    const events = [
      makeEvent({ id: 'activity', type: 'activity', date: '2026-03-15', time: '15:00' }),
      makeEvent({ id: 'hotel', type: 'accommodation', date: '2026-03-15', endDate: '2026-03-16', time: '15:00' }),
    ];
    const timeline = buildTimeline(events);
    // check-in at 15:00 should come before activity at 15:00
    const ids = timeline.map(e => e.entryId);
    expect(ids[0]).toBe('hotel::check-in');
    expect(ids[1]).toBe('activity');
  });

  it('preserveOrder skips sorting', () => {
    const events = [
      makeEvent({ id: 'b', date: '2026-03-17' }),
      makeEvent({ id: 'a', date: '2026-03-15' }),
    ];
    const timeline = buildTimeline(events, { preserveOrder: true });
    expect(timeline.map(e => e.event.id)).toEqual(['b', 'a']);
  });

  it('uses departureTime for flights', () => {
    const events = [
      makeEvent({ id: 'late-flight', type: 'flight', date: '2026-03-15', departureTime: '20:00' }),
      makeEvent({ id: 'early-activity', type: 'activity', date: '2026-03-15', time: '09:00' }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline[0].event.id).toBe('early-activity');
    expect(timeline[1].event.id).toBe('late-flight');
  });

  it('handles ISO datetime dates correctly', () => {
    const events = [
      makeEvent({ id: 'b', date: '2026-03-17T00:00:00.000Z' }),
      makeEvent({ id: 'a', date: '2026-03-15T00:00:00.000Z' }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline[0].event.id).toBe('a');
    expect(timeline[1].event.id).toBe('b');
  });
});

// ─── eventsFromTimeline ───────────────────────────────────
describe('eventsFromTimeline', () => {
  it('deduplicates accommodation check-in/check-out into single event', () => {
    const hotel = makeEvent({ id: 'hotel', type: 'accommodation', date: '2026-03-15', endDate: '2026-03-17' });
    const timeline = buildTimeline([hotel]);
    expect(timeline).toHaveLength(2);
    const events = eventsFromTimeline(timeline);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('hotel');
  });

  it('preserves order of first appearance', () => {
    const events = [
      makeEvent({ id: 'a', date: '2026-03-15' }),
      makeEvent({ id: 'b', date: '2026-03-16' }),
    ];
    const timeline = buildTimeline(events);
    const result = eventsFromTimeline(timeline);
    expect(result.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('successfully interleaves an activity between check-in and check-out', () => {
    const hotel = makeEvent({ id: 'hotel', type: 'accommodation', date: '2026-03-15', endDate: '2026-03-17' });
    const activity = makeEvent({ id: 'activity', type: 'activity', date: '2026-03-16' });
    
    // Simulating the timeline after a manual reorder: [Check-in, Activity, Check-out]
    const timeline: any = [
      { entryId: 'hotel::check-in', event: hotel, isBookend: 'check-in' },
      { entryId: 'activity', event: activity },
      { entryId: 'hotel::check-out', event: hotel, isBookend: 'check-out' },
    ];
    
    const result = eventsFromTimeline(timeline);
    
    // EXPECTED: hotel event at index 0 becomes 'check-in', activity is at index 1, 
    // and a NEW event object (or same id, different type) for 'check-out' is at index 2.
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('check-in');
    expect(result[1].id).toBe('activity');
    expect(result[2].type).toBe('check-out');
    
    // Feed back into buildTimeline (with preserveOrder)
    const finalTimeline = buildTimeline(result, { preserveOrder: true });
    const finalIds = finalTimeline.map(e => e.entryId);
    
    // It should now correctly be interleaved!
    // Since hotel at index 2 has ID 'hotel::split-out' and type 'check-out',
    // its entryId in timeline will be its ID 'hotel::split-out'.
    // The check-in at index 0 has type 'check-in', its entryId will be 'hotel'.
    expect(finalIds).toEqual(['hotel', 'activity', 'hotel::split-out']);
  });
});

// ─── buildEventTable ──────────────────────────────────────
describe('buildEventTable', () => {
  it('includes date row', () => {
    const event = makeEvent({ date: '2026-03-15' });
    const table = buildEventTable(event);
    expect(table.rows[0].field).toBe('Date');
    expect(table.rows[0].details).toContain('15/03/26');
  });

  it('shows date range for accommodation with endDate', () => {
    const event = makeEvent({ type: 'accommodation', date: '2026-03-15', endDate: '2026-03-17' });
    const table = buildEventTable(event);
    expect(table.rows[0].details).toContain('–');
  });

  it('shows check-out date for check-out bookend', () => {
    const event = makeEvent({ type: 'accommodation', date: '2026-03-15', endDate: '2026-03-17' });
    const table = buildEventTable(event, 'check-out');
    expect(table.rows[0].details).toContain('17/03/26');
    expect(table.rows[1].details).toContain('Check-out');
  });

  it('shows departure/arrival for flights', () => {
    const event = makeEvent({
      type: 'flight',
      departureLocation: 'LAX',
      departureTime: '08:00',
      arrivalLocation: 'NRT',
      arrivalTime: '14:00',
    });
    const table = buildEventTable(event);
    const fields = table.rows.map(r => r.field);
    expect(fields).toContain('Departure');
    expect(fields).toContain('Arrival');
  });

  it('includes confirmation code', () => {
    const event = makeEvent({ confirmationCode: 'ABC123' });
    const table = buildEventTable(event);
    const confirmRow = table.rows.find(r => r.field === 'Confirmation');
    expect(confirmRow?.details).toBe('ABC123');
  });

  it('includes links as note items', () => {
    const event = makeEvent({
      links: [{ label: 'Booking', url: 'https://example.com' }],
    });
    const table = buildEventTable(event);
    expect(table.noteItems).toHaveLength(1);
    expect(table.noteItems[0]).toContain('🔗');
  });
});
