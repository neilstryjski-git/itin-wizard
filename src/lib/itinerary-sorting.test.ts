import { describe, it, expect } from 'vitest';
import { buildTimeline } from './itinerary-utils';
import { ItineraryEvent } from '@/types/project';

describe('buildTimeline Tie-breaking', () => {
  const makeEvent = (overrides: Partial<ItineraryEvent>): ItineraryEvent => ({
    id: crypto.randomUUID(),
    type: 'activity',
    title: 'Test',
    date: '2026-03-10',
    time: '12:00',
    links: [],
    ...overrides
  });

  it('sorts newest event first when dates and times are identical', () => {
    const oldEvent = makeEvent({ 
      id: 'old', 
      createdAt: '2026-03-08T10:00:00Z' 
    });
    const newEvent = makeEvent({ 
      id: 'new', 
      createdAt: '2026-03-08T11:00:00Z' 
    });

    // Order in input array shouldn't matter
    const timeline = buildTimeline([oldEvent, newEvent]);
    
    expect(timeline[0].event.id).toBe('new');
    expect(timeline[1].event.id).toBe('old');
  });

  it('still sorts by time first even if one is newer', () => {
    const earlyEvent = makeEvent({ 
      id: 'early', 
      time: '08:00', 
      createdAt: '2026-03-08T11:00:00Z' 
    });
    const lateEvent = makeEvent({ 
      id: 'late', 
      time: '20:00', 
      createdAt: '2026-03-08T10:00:00Z' 
    });

    const timeline = buildTimeline([earlyEvent, lateEvent]);
    
    expect(timeline[0].event.id).toBe('early');
    expect(timeline[1].event.id).toBe('late');
  });
});
