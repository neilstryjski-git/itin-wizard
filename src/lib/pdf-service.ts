import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TravelProject } from '@/types/project';
import {
  formatDate, buildEventTable, getEventTitlePdf, stripEmoji, buildTimeline, googleMapsUrl
} from './itinerary-utils';

/**
 * PDF Generation Service
 * Handles the logic for creating the Travel Library official records.
 */
export async function downloadPdf(project: TravelProject) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Event-type accent colours — muted/desaturated for minimalist line-art style
  const EVENT_COLOR: Record<string, [number, number, number]> = {
    'flight':        [70,  105, 175],  // muted blue
    'check-in':      [50,  130,  90],  // muted green
    'check-out':     [45,  145, 138],  // muted teal
    'accommodation': [50,  130,  90],  // muted green
    'activity':      [185,  95,  50],  // muted orange
    'transfer':      [115,  80, 180],  // muted purple
  };
  const DEFAULT_COLOR: [number, number, number] = [100, 110, 125]; // muted slate

  const addPageNumbers = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text(
        `Trip Wizard  •  Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
    }
  };

  // ── Cover block ──────────────────────────────────────────────────────────
  let y = 18;

  // Thin accent pip (2mm wide, not a full bar)
  doc.setFillColor(70, 105, 175);
  doc.rect(margin, y - 5, 2, 12, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(project.metadata.name || 'Travel Itinerary', margin + 5, y + 2);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Metadata row
  const metaParts: string[] = [];
  if (project.metadata.startDate) {
    metaParts.push(`${formatDate(project.metadata.startDate)} – ${project.metadata.endDate ? formatDate(project.metadata.endDate) : 'TBD'}`);
  }
  if (project.metadata.travelers.length > 0) {
    metaParts.push(project.metadata.travelers.map(t => `${t.name}${t.isMinor ? ' (minor)' : ''}`).join(', '));
  }
  if (metaParts.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text(metaParts.join('   |   '), margin + 5, y);
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  // Trip Summary
  if (project.phase_2_itinerary.summary && (project.phase_2_itinerary.summary.notes || project.phase_2_itinerary.summary.links.length > 0)) {
    y += 2;
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.5);
    
    let contentHeight = 0;
    if (project.phase_2_itinerary.summary.notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 90, 105);
      const splitNotes = doc.splitTextToSize(project.phase_2_itinerary.summary.notes, pageWidth - margin * 2 - 6);
      contentHeight += splitNotes.length * 4 + 4;
    }
    
    if (project.phase_2_itinerary.summary.links.length > 0) {
      contentHeight += project.phase_2_itinerary.summary.links.length * 4 + 2;
    }

    doc.line(margin, y, margin, y + contentHeight);

    if (project.phase_2_itinerary.summary.notes) {
      const splitNotes = doc.splitTextToSize(project.phase_2_itinerary.summary.notes, pageWidth - margin * 2 - 6);
      doc.text(splitNotes, margin + 4, y + 4);
      y += (splitNotes.length * 4 + 4);
    }

    if (project.phase_2_itinerary.summary.links.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      project.phase_2_itinerary.summary.links.forEach(link => {
        if (y > 270) { doc.addPage(); y = 15; }
        const linkText = `• ${link.label}${link.url ? `: ${link.url}` : ''}`;
        const splitLink = doc.splitTextToSize(linkText, pageWidth - margin * 2 - 6);
        doc.setTextColor(70, 105, 175);
        doc.text(splitLink, margin + 4, y);
        if (link.url) doc.link(margin + 4, y - 3, pageWidth - margin * 2 - 6, 4, { url: link.url });
        doc.setTextColor(0, 0, 0);
        y += splitLink.length * 4;
      });
      y += 2;
    }
  }

  y += 5;
  doc.setDrawColor(210, 215, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ── Events ───────────────────────────────────────────────────────────────
  const timeline = buildTimeline(project.phase_2_itinerary.events);
  
  for (const entry of timeline) {
    const event = entry.event;
    const typeColor = EVENT_COLOR[event.type] || DEFAULT_COLOR;
    const table = buildEventTable(event, entry.isBookend);
    const pdfNotes = stripEmoji(table.notes);

    const estimatedHeight = 14 + 9 + (table.rows.length * 10);
    if (y + estimatedHeight > pageHeight - 20) { doc.addPage(); y = 15; }

    doc.setFillColor(...typeColor);
    doc.rect(margin, y - 3.5, 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(getEventTitlePdf(event), margin + 5, y + 1.5);
    doc.setTextColor(0, 0, 0);
    y += 3;

    const fieldMap: Record<string, string> = {
      'Location': 'location', 'Departure': 'departureLocation', 'Arrival': 'arrivalLocation',
    };
    const detailUrls: Record<number, string> = {};
    table.rows.forEach((r, i) => {
      const fk = fieldMap[r.field];
      // Use stored field URL if exists, otherwise fallback to auto-maps
      const fieldUrl = fk && event.fieldUrls?.[fk];
      const isLoc = ['Location', 'Departure', 'Arrival'].includes(r.field);
      const url = fieldUrl || (isLoc && r.details ? googleMapsUrl(r.details) : '');
      if (url) detailUrls[i] = url;
    });

    const linkUrls: string[] = event.links.map(l => l.url || '');

    const bodyRows = table.rows.map((r, i) => {
      if (i === 0 && pdfNotes) {
        return [r.field, r.details, { content: pdfNotes, rowSpan: table.rows.length }];
      }
      if (i > 0 && pdfNotes) {
        return [r.field, r.details];
      }
      return [r.field, r.details, ''];
    });

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Details', 'Notes/Documents']],
      body: bodyRows,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [80, 90, 105],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 2, right: 2.5, bottom: 3, left: 2.5 },
      },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold', textColor: [100, 110, 125] },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 55, textColor: [100, 110, 125], fontSize: 7.5 },
      },
      styles: { overflow: 'linebreak', lineWidth: 0.15, lineColor: [225, 230, 235] },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        if (data.column.index === 1 && detailUrls[data.row.index]) {
          data.cell.styles.textColor = [70, 105, 175];
        }
        if (data.column.index === 2 && data.row.index === 0 && linkUrls.some(u => u)) {
          data.cell.styles.textColor = [70, 105, 175];
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'head') {
          doc.setDrawColor(...typeColor);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          doc.setDrawColor(225, 230, 235);
          doc.setLineWidth(0.15);
          return;
        }
        if (data.section !== 'body') return;
        if (data.column.index === 1 && detailUrls[data.row.index]) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: detailUrls[data.row.index], newWindow: true });
        }
        if (data.column.index === 2 && data.row.index === 0 && linkUrls.some(u => u)) {
          const lineHeight = 3.5;
          let cy = data.cell.y + 2.5;
          linkUrls.forEach((url) => {
            if (url) doc.link(data.cell.x, cy - 1.5, data.cell.width, lineHeight, { url, newWindow: true });
            cy += lineHeight;
          });
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Final Checklist
  if (project.phase_1_requirements.checklist.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFillColor(70, 105, 175);
    doc.rect(margin, y - 3.5, 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Requirements Checklist', margin + 5, y + 1.5);
    doc.setTextColor(0, 0, 0);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['', 'Item', 'Notes']],
      body: project.phase_1_requirements.checklist.map(item => [item.checked ? 'Y' : '-', item.title, item.description || '']),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [80, 90, 105], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2, right: 2.5, bottom: 3, left: 2.5 } },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center', textColor: [50, 130, 90], fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 55, textColor: [100, 110, 125], fontSize: 7.5 } },
      styles: { overflow: 'linebreak', lineWidth: 0.15, lineColor: [225, 230, 235] },
      didDrawCell: (data: any) => {
        if (data.section === 'head') {
          doc.setDrawColor(70, 105, 175);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          doc.setDrawColor(225, 230, 235);
          doc.setLineWidth(0.15);
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Packing List
  if (project.phase_3_packing.items.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFillColor(70, 105, 175);
    doc.rect(margin, y - 3.5, 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Packing List', margin + 5, y + 1.5);
    doc.setTextColor(0, 0, 0);
    y += 3;
    const cats = [...new Set(project.phase_3_packing.items.map(i => i.category))].sort();
    const packRows = cats.flatMap(cat => [
      [{ content: cat, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [248, 249, 251] as [number, number, number], textColor: [80, 90, 105] as [number, number, number], fontSize: 7.5 } }],
      ...project.phase_3_packing.items.filter(i => i.category === cat).map(item => [item.checked ? 'Y' : '-', item.name, item.assignedTo || '']),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['', 'Item', 'Assigned To']],
      body: packRows,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [80, 90, 105], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2, right: 2.5, bottom: 3, left: 2.5 } },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center', textColor: [50, 130, 90], fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 40, textColor: [100, 110, 125] } },
      styles: { overflow: 'linebreak', lineWidth: 0.15, lineColor: [225, 230, 235] },
      didDrawCell: (data: any) => {
        if (data.section === 'head') {
          doc.setDrawColor(70, 105, 175);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          doc.setDrawColor(225, 230, 235);
          doc.setLineWidth(0.15);
        }
      },
    });
  }

  addPageNumbers();
  const filename = `${(project.metadata.name || 'itinerary').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
