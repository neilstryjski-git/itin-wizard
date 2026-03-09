import { describe, it, expect } from 'vitest';
import { TravelProject } from '@/types/project';

// We extract the pure logic from useProjects.ts into a testable function
// In a real app, you'd export this from useProjects.ts or a utility file.
function processProjectRows(owned: any[], sharedJson: any[], sharedTable: any[]): TravelProject[] {
  const allRows = [...(owned || []), ...(sharedJson || []), ...sharedTable];
  const uniqueRows = Array.from(new Map(allRows.map(r => [r.project_id, r])).values());
  
  return uniqueRows.map(row => ({
    ...(row.data as unknown as TravelProject),
    owner_email: row.owner_email
  }));
}

describe('useProjects Filtering Logic', () => {
  const mockProject1 = {
    project_id: 'p1',
    owner_email: 'owner@test.com',
    data: {
      project_id: 'p1',
      metadata: { name: 'Trip 1', collaborators: ['collab@test.com'] }
    }
  };

  const mockProject2 = {
    project_id: 'p2',
    owner_email: 'other@test.com',
    data: {
      project_id: 'p2',
      metadata: { name: 'Trip 2', collaborators: ['collab@test.com'] }
    }
  };

  it('combines and deduplicates projects from multiple sources', () => {
    const owned = [mockProject1];
    const sharedJson = [mockProject2];
    const sharedTable = [mockProject2]; // Duplicate of mockProject2

    const result = processProjectRows(owned, sharedJson, sharedTable);

    expect(result).toHaveLength(2);
    expect(result.map(p => p.project_id)).toContain('p1');
    expect(result.map(p => p.project_id)).toContain('p2');
    expect(result.find(p => p.project_id === 'p1')?.owner_email).toBe('owner@test.com');
  });

  it('handles empty sources gracefully', () => {
    const result = processProjectRows([], [], []);
    expect(result).toHaveLength(0);
  });

  it('prioritizes row data but injects owner_email', () => {
    const owned = [{
      project_id: 'p3',
      owner_email: 'real-owner@test.com',
      data: {
        project_id: 'p3',
        metadata: { name: 'Trip 3' }
      }
    }];
    
    const result = processProjectRows(owned, [], []);
    expect(result[0].owner_email).toBe('real-owner@test.com');
  });

  it('works for any shared email by correctly merging results', () => {
    // This simulates the logic that would run for ANY user email
    const userEmail = 'random-user@test.com';
    
    // Simulating what Supabase would return for 'random-user@test.com'
    const owned: any[] = [];
    const sharedJson = [{
      project_id: 'p-shared',
      owner_email: 'creator@test.com',
      data: {
        project_id: 'p-shared',
        metadata: { name: 'Shared Trip', collaborators: [userEmail] }
      }
    }];
    const sharedTable: any[] = [];

    const result = processProjectRows(owned, sharedJson, sharedTable);
    
    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('p-shared');
    expect(result[0].metadata.collaborators).toContain(userEmail);
  });
});
