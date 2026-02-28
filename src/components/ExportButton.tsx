import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ItineraryEvent, TravelProject } from '@/types/project';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EVENT_EMOJI: Record<string, string> = {
  'flight-departure': '✈',
  'flight-arrival': '✈',
  'check-in': '🏡',
  'check-out': '🏡',
  'accommodation': '🏡',
  'activity': '📍',
  'transfer': '🚗',
};

function formatDate(dateStr: string): string {
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

function formatTime(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function buildEventRows(event: ItineraryEvent): string[][] {
  const rows: string[][] = [];

  // Date row
  if (event.type === 'accommodation' && event.endDate) {
    const notes: string[] = [];
    if (event.links.length > 0) notes.push(...event.links.map(l => `• ${l.label}`));
    rows.push(['Date', `${formatDate(event.date)} – ${formatDate(event.endDate)}`, notes.join('\n')]);
  } else {
    const notes: string[] = [];
    if (event.links.length > 0) notes.push(...event.links.map(l => `• ${l.label}`));
    rows.push(['Date', formatDate(event.date), notes.join('\n')]);
  }

  // Time row
  if (event.time) {
    let timeStr = '';
    if (event.type === 'accommodation') {
      timeStr = `Check-in after ${formatTime(event.time)}`;
    } else if (event.type === 'flight-departure') {
      timeStr = `Departure at ${formatTime(event.time)}`;
    } else if (event.type === 'flight-arrival') {
      timeStr = `Arrival at ${formatTime(event.time)}`;
    } else {
      timeStr = formatTime(event.time);
    }
    rows.push(['Time', timeStr, '']);
  }

  // Location row
  if (event.location || event.address) {
    const loc = [event.location, event.address].filter(Boolean).join(', ');
    rows.push(['Location', loc, '']);
  }

  // Details / Notes row
  if (event.notes || event.flightNumber) {
    const details = [event.flightNumber, event.notes].filter(Boolean).join('. ');
    rows.push(['Details', details, '']);
  }

  // Confirmation row
  if (event.confirmationCode) {
    rows.push(['Confirmation', event.confirmationCode, '']);
  }

  // Attachments row
  if (event.attachments && event.attachments.length > 0) {
    rows.push(['Attachments', event.attachments.map(a => `• ${a.name}`).join('\n'), '']);
  }

  return rows;
}

function getEventTitle(event: ItineraryEvent): string {
  const emoji = EVENT_EMOJI[event.type] || '📍';
  return `${emoji} ${event.title}`;
}

export function ExportButton({ projectId }: { projectId: string }) {
  const { getProject } = useProjectsContext();

  const generatePDF = () => {
    const project = getProject(projectId);
    if (!project) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 15;

    // --- Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const flag = project.metadata.destination ? `🇬🇧 ` : '';
    doc.text(`${project.metadata.name || 'Travel Itinerary'}`, margin, y);
    y += 8;

    // Travelers
    if (project.metadata.travelers.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Travelers:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(
        project.metadata.travelers.map(t => `${t.name}${t.isMinor ? ' (minor)' : ''}`).join(', '),
        margin, y
      );
      y += 6;
    }

    // Dates
    if (project.metadata.startDate) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Dates:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${formatDate(project.metadata.startDate)} – ${project.metadata.endDate ? formatDate(project.metadata.endDate) : 'TBD'}`,
        margin, y
      );
      y += 8;
    }

    // Separator
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // --- Events ---
    const sorted = [...project.phase_2_itinerary.events].sort(
      (a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
    );

    for (const event of sorted) {
      // Check if we need a new page (rough estimate)
      if (y > 250) {
        doc.addPage();
        y = 15;
      }

      // Event title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(getEventTitle(event), margin, y);
      y += 2;

      // Event table
      const rows = buildEventRows(event);

      autoTable(doc, {
        startY: y,
        head: [['Field', 'Details', 'Notes/Documents']],
        body: rows,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 55 },
        },
        styles: {
          overflow: 'linebreak',
          lineWidth: 0.2,
          lineColor: [200, 200, 200],
        },
        didDrawPage: () => {},
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Requirements Checklist (if any) ---
    if (project.phase_1_requirements.checklist.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📋 Requirements Checklist', margin, y);
      y += 2;

      const checkRows = project.phase_1_requirements.checklist.map(item => [
        item.checked ? '✓' : '☐',
        item.title,
        item.description || '',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['', 'Item', 'Notes']],
        body: checkRows,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 55 } },
        styles: { overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200] },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Packing List (if any) ---
    if (project.phase_3_packing.items.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('🧳 Packing List', margin, y);
      y += 2;

      const cats = [...new Set(project.phase_3_packing.items.map(i => i.category))].sort();
      const packRows = cats.flatMap(cat => [
        [{ content: cat, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] as [number, number, number] } }],
        ...project.phase_3_packing.items
          .filter(i => i.category === cat)
          .map(item => [item.checked ? '✓' : '☐', item.name, item.assignedTo || '']),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['', 'Item', 'Assigned To']],
        body: packRows,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 40 } },
        styles: { overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200] },
      });
    }

    // Save
    const filename = `${(project.metadata.name || 'itinerary').replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} className="gap-1">
      <Download className="h-3 w-3" /> Export PDF
    </Button>
  );
}
