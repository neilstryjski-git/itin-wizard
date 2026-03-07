
export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'done' | 'bug';
  owner?: string;
}

export function parseRoadmapMarkdown(md: string): { features: RoadmapItem[], bugs: RoadmapItem[] } {
  const features: RoadmapItem[] = [];
  const bugs: RoadmapItem[] = [];

  // Match tables using regex
  // Section headers: ## 🚀 Feature Backlog and ## 🔴 Active Bugs
  const featureSectionMatch = md.match(/## 🚀 Feature Backlog\s+\| ID \| Feature \| Description \| Target Agent \|\s+\| :--- \| :--- \| :--- \| :--- \|\s+([\s\S]*?)(?=\n---|\n#|$)/);
  const bugSectionMatch = md.match(/## 🔴 Active Bugs\s+\| ID \| Issue \| Description \| Current Owner \|\s+\| :--- \| :--- \| :--- \| :--- \|\s+([\s\S]*?)(?=\n---|\n#|$)/);

  if (featureSectionMatch) {
    const rows = featureSectionMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        features.push({
          id: cols[0].replace(/\*\*/g, ''),
          title: cols[1].replace(/\*\*/g, ''),
          description: cols[2],
          status: 'planned',
          owner: cols[3]
        });
      }
    });
  }

  if (bugSectionMatch) {
    const rows = bugSectionMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        bugs.push({
          id: cols[0].replace(/\*\*/g, ''),
          title: cols[1].replace(/\*\*/g, ''),
          description: cols[2],
          status: 'bug',
          owner: cols[3]
        });
      }
    });
  }

  return { features, bugs };
}
