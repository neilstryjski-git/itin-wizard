import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, ArrowLeft, Plus, X, Pencil, Check, Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ItineraryEvent, TravelLink } from '@/types/project';
import {
  EVENT_EMOJI, EVENT_TYPE_LABELS, formatDate, formatTime,
  buildEventRows, getEventTitle, EventRow,
} from '@/lib/itinerary-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function ExportPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject } = useProjectsContext();
  const navigate = useNavigate();
  const project = getProject(projectId!);

  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState<{ eventId: string; label: string; url: string } | null>(null);
  const [notesEdit, setNotesEdit] = useState<{ eventId: string; field: string; value: string } | null>(null);

  if (!project) { navigate('/'); return null; }

  const sorted = [...project.phase_2_itinerary.events].sort(
    (a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
  );

  const updateEvent = (eventId: string, updates: Partial<ItineraryEvent>) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: p.phase_2_itinerary.events.map(e =>
          e.id === eventId ? { ...e, ...updates } : e
        ),
      },
    }));
  };

  const addLink = (eventId: string, link: TravelLink) => {
    const event = sorted.find(e => e.id === eventId);
    if (!event) return;
    updateEvent(eventId, { links: [...event.links, link] });
  };

  const removeLink = (eventId: string, index: number) => {
    const event = sorted.find(e => e.id === eventId);
    if (!event) return;
    updateEvent(eventId, { links: event.links.filter((_, i) => i !== index) });
  };

  const saveNotesEdit = () => {
    if (!notesEdit) return;
    const { eventId, field, value } = notesEdit;
    if (field === 'notes') updateEvent(eventId, { notes: value });
    if (field === 'location') updateEvent(eventId, { location: value });
    if (field === 'address') updateEvent(eventId, { address: value });
    if (field === 'confirmationCode') updateEvent(eventId, { confirmationCode: value });
    if (field === 'flightNumber') updateEvent(eventId, { flightNumber: value });
    setNotesEdit(null);
  };

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 15;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(project.metadata.name || 'Travel Itinerary', margin, y);
    y += 8;

    if (project.metadata.travelers.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Travelers:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(project.metadata.travelers.map(t => `${t.name}${t.isMinor ? ' (minor)' : ''}`).join(', '), margin, y);
      y += 6;
    }

    if (project.metadata.startDate) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Dates:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(project.metadata.startDate)} – ${project.metadata.endDate ? formatDate(project.metadata.endDate) : 'TBD'}`, margin, y);
      y += 8;
    }

    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    for (const event of sorted) {
      if (y > 250) { doc.addPage(); y = 15; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(getEventTitle(event), margin, y);
      y += 2;

      const rows = buildEventRows(event);
      autoTable(doc, {
        startY: y,
        head: [['Field', 'Details', 'Notes/Documents']],
        body: rows.map(r => [r.field, r.details, r.notes]),
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 55 } },
        styles: { overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (project.phase_1_requirements.checklist.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📋 Requirements Checklist', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['', 'Item', 'Notes']],
        body: project.phase_1_requirements.checklist.map(item => [item.checked ? '✓' : '☐', item.title, item.description || '']),
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 55 } },
        styles: { overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (project.phase_3_packing.items.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('🧳 Packing List', margin, y);
      y += 2;
      const cats = [...new Set(project.phase_3_packing.items.map(i => i.category))].sort();
      const packRows = cats.flatMap(cat => [
        [{ content: cat, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] as [number, number, number] } }],
        ...project.phase_3_packing.items.filter(i => i.category === cat).map(item => [item.checked ? '✓' : '☐', item.name, item.assignedTo || '']),
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

    doc.save(`${(project.metadata.name || 'itinerary').replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}/itinerary`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-heading text-2xl font-bold">Export Preview</h2>
            <p className="text-sm text-muted-foreground">Review and enhance before downloading</p>
          </div>
        </div>
        <Button onClick={generatePDF} className="gap-1">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      {/* Document Preview */}
      <div className="bg-background border rounded-lg shadow-sm p-6 md:p-10 space-y-1">
        {/* Title Block */}
        <h1 className="text-xl font-bold mb-1">{project.metadata.name || 'Travel Itinerary'}</h1>
        {project.metadata.travelers.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold">Travelers: </span>
            {project.metadata.travelers.map(t => `${t.name}${t.isMinor ? ' (minor)' : ''}`).join(', ')}
          </div>
        )}
        {project.metadata.startDate && (
          <div className="text-sm">
            <span className="font-semibold">Dates: </span>
            {formatDate(project.metadata.startDate)} – {project.metadata.endDate ? formatDate(project.metadata.endDate) : 'TBD'}
          </div>
        )}

        <hr className="my-4 border-border" />

        {/* Events */}
        {sorted.map(event => {
          const rows = buildEventRows(event);
          const isEditing = editingEvent === event.id;

          return (
            <div key={event.id} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base">{getEventTitle(event)}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditingEvent(isEditing ? null : event.id)}
                >
                  {isEditing ? <><Check className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /> Edit</>}
                </Button>
              </div>

              {/* Table */}
              <table className="w-full text-sm border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 border-b border-border font-semibold w-[100px]">Field</th>
                    <th className="text-left p-2 border-b border-border font-semibold">Details</th>
                    <th className="text-left p-2 border-b border-border font-semibold w-[200px]">Notes/Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border last:border-b-0">
                      <td className="p-2 font-semibold text-muted-foreground align-top">{row.field}</td>
                      <td className="p-2 align-top">
                        {isEditing && notesEdit?.eventId === event.id && notesEdit.field === row.field.toLowerCase() ? (
                          <div className="flex gap-1">
                            <Input
                              className="h-7 text-xs"
                              value={notesEdit.value}
                              onChange={e => setNotesEdit({ ...notesEdit, value: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && saveNotesEdit()}
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={saveNotesEdit}>
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={isEditing ? 'cursor-pointer hover:bg-muted/50 px-1 rounded' : ''}
                            onClick={() => {
                              if (!isEditing) return;
                              const fieldMap: Record<string, string> = {
                                'Location': 'location',
                                'Details': 'notes',
                                'Confirmation': 'confirmationCode',
                              };
                              const mapped = fieldMap[row.field];
                              if (mapped) {
                                setNotesEdit({ eventId: event.id, field: mapped, value: (event as any)[mapped] || '' });
                              }
                            }}
                          >
                            {row.details}
                          </span>
                        )}
                      </td>
                      <td className="p-2 align-top text-xs text-muted-foreground whitespace-pre-line">
                        {row.notes}
                        {/* Show links for the Date row */}
                        {row.field === 'Date' && isEditing && (
                          <div className="mt-1 space-y-1">
                            {event.links.map((link, li) => (
                              <div key={li} className="flex items-center gap-1">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                                  <ExternalLink className="h-2.5 w-2.5" /> {link.label}
                                </a>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeLink(event.id, li)}>
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                            {linkForm?.eventId === event.id ? (
                              <div className="flex gap-1 mt-1">
                                <Input
                                  className="h-6 text-xs"
                                  placeholder="Label"
                                  value={linkForm.label}
                                  onChange={e => setLinkForm({ ...linkForm, label: e.target.value })}
                                />
                                <Input
                                  className="h-6 text-xs"
                                  placeholder="https://..."
                                  value={linkForm.url}
                                  onChange={e => setLinkForm({ ...linkForm, url: e.target.value })}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1"
                                  onClick={() => {
                                    if (linkForm.label && linkForm.url) {
                                      addLink(event.id, { label: linkForm.label, url: linkForm.url });
                                      setLinkForm(null);
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setLinkForm(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-xs gap-0.5 mt-1 text-primary"
                                onClick={() => setLinkForm({ eventId: event.id, label: '', url: '' })}
                              >
                                <Plus className="h-2.5 w-2.5" /> Add link
                              </Button>
                            )}
                          </div>
                        )}
                        {/* Show links in non-edit mode */}
                        {row.field === 'Date' && !isEditing && event.links.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {event.links.map((link, li) => (
                              <a key={li} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-primary hover:underline">
                                <ExternalLink className="h-2.5 w-2.5" /> {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No events to preview. Add events to your itinerary first.
          </p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex justify-end mt-6 gap-2">
        <Button variant="outline" onClick={() => navigate(`/project/${projectId}/itinerary`)}>
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to Itinerary
        </Button>
        <Button onClick={generatePDF} className="gap-1">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
