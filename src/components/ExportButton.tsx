import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectsContext } from '@/contexts/ProjectsContext';

export function ExportButton({ projectId }: { projectId: string }) {
  const { getProject } = useProjectsContext();

  const handleExport = () => {
    const project = getProject(projectId);
    if (!project) return;

    const lines: string[] = [];
    const add = (text: string) => lines.push(text);
    const br = () => lines.push('');

    add(`MASTER ITINERARY: ${project.metadata.name || 'Untitled Trip'}`);
    add('='.repeat(50));
    br();

    if (project.metadata.destination) add(`Destination: ${project.metadata.destination}`);
    if (project.metadata.startDate) add(`Dates: ${project.metadata.startDate} – ${project.metadata.endDate || 'TBD'}`);
    add(`Travelers: ${project.metadata.travelers.map(t => `${t.name}${t.isMinor ? ' (minor)' : ''}`).join(', ') || 'None listed'}`);
    add(`Transit via USA: ${project.metadata.transitViaUSA ? 'Yes' : 'No'}`);
    br();

    if (project.phase_1_requirements.checklist.length > 0) {
      add('REQUIREMENTS CHECKLIST');
      add('-'.repeat(30));
      project.phase_1_requirements.checklist.forEach(item => {
        add(`  [${item.checked ? 'X' : ' '}] ${item.text}${item.autoAdded ? ' ⚡' : ''}`);
      });
      br();
    }

    if (project.phase_2_itinerary.events.length > 0) {
      add('ITINERARY');
      add('-'.repeat(30));
      const sorted = [...project.phase_2_itinerary.events].sort(
        (a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
      );
      sorted.forEach(event => {
        add(`  ${event.date}${event.time ? ' ' + event.time : ''} | ${event.type.toUpperCase().replace('-', ' ')} | ${event.title}`);
        if (event.location) add(`    Location: ${event.location}`);
        if (event.confirmationCode) add(`    Confirmation: ${event.confirmationCode}`);
        if (event.notes) add(`    Notes: ${event.notes}`);
        event.links.forEach(link => {
          add(`    Link: ${link.label} — ${link.url}`);
        });
        br();
      });
    }

    if (project.phase_3_packing.items.length > 0) {
      add('PACKING LIST');
      add('-'.repeat(30));
      const cats = [...new Set(project.phase_3_packing.items.map(i => i.category))].sort();
      cats.forEach(cat => {
        add(`  ${cat}:`);
        project.phase_3_packing.items
          .filter(i => i.category === cat)
          .forEach(item => {
            add(`    [${item.checked ? 'X' : ' '}] ${item.name}${item.autoAdded ? ' ⚡' : ''}`);
          });
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.metadata.name || 'itinerary').replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
      <Download className="h-3 w-3" /> Export
    </Button>
  );
}
