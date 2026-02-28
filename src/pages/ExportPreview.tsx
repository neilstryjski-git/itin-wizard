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
  buildEventTable, getEventTitle, buildTimeline,
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
  const [linkForm, setLinkForm] = useState<{ eventId: string; label: string; url: string; mode: 'link' | 'note' } | null>(null);
  const [notesEdit, setNotesEdit] = useState<{ eventId: string; field: string; value: string } | null>(null);
  const [fieldLinkEdit, setFieldLinkEdit] = useState<{ eventId: string; field: string; url: string } | null>(null);

  if (!project) { navigate('/'); return null; }

  const timeline = buildTimeline(project.phase_2_itinerary.events);

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
    const event = project.phase_2_itinerary.events.find(e => e.id === eventId);
    if (!event) return;
    updateEvent(eventId, { links: [...event.links, link] });
  };

  const removeLink = (eventId: string, index: number) => {
    const event = project.phase_2_itinerary.events.find(e => e.id === eventId);
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

    if (project.metadata.startDate && project.metadata.startDate.length > 0) {
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

    for (const entry of timeline) {
      const event = entry.event;
      if (y > 250) { doc.addPage(); y = 15; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(getEventTitle(event), margin, y);
      y += 2;

      const table = buildEventTable(event);
      const bodyRows = table.rows.map((r, i) => {
        if (i === 0 && table.notes) {
          return [r.field, r.details, { content: table.notes, rowSpan: table.rows.length }];
        }
        if (i > 0 && table.notes) {
          return [r.field, r.details]; // notes cell is spanned from first row
        }
        return [r.field, r.details, ''];
      });
      autoTable(doc, {
        startY: y,
        head: [['Field', 'Details', 'Notes/Documents']],
        body: bodyRows,
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
        {project.metadata.startDate && project.metadata.startDate.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold">Dates: </span>
            {formatDate(project.metadata.startDate)} – {project.metadata.endDate ? formatDate(project.metadata.endDate) : 'TBD'}
          </div>
        )}

        <hr className="my-4 border-border" />

        {/* Events */}
        {timeline.map((entry, idx) => {
          const event = entry.event;
          const table = buildEventTable(event);
          const isEditing = editingEvent === event.id;

          return (
            <div key={`${event.id}-${entry.isBookend || idx}`} className="mb-6">
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
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border last:border-b-0">
                      <td className="p-2 font-semibold text-muted-foreground align-top">{row.field}</td>
                      <td className="p-2 align-top">
                        {(() => {
                          const fieldMap: Record<string, string> = {
                            'Location': 'location',
                            'Details': 'notes',
                            'Confirmation': 'confirmationCode',
                            'Departure': 'departureLocation',
                            'Arrival': 'arrivalLocation',
                          };
                          const fieldKey = fieldMap[row.field];
                          const fieldUrl = fieldKey && event.fieldUrls?.[fieldKey];

                          // Editing the text value
                          if (isEditing && notesEdit?.eventId === event.id && notesEdit.field === fieldKey) {
                            return (
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
                            );
                          }

                          // Adding a URL to a field
                          if (isEditing && fieldLinkEdit?.eventId === event.id && fieldLinkEdit.field === fieldKey) {
                            return (
                              <div className="space-y-1">
                                <span className="text-xs">{row.details}</span>
                                <div className="flex gap-1">
                                  <Input
                                    className="h-6 text-xs"
                                    placeholder="https://..."
                                    value={fieldLinkEdit.url}
                                    onChange={e => setFieldLinkEdit({ ...fieldLinkEdit, url: e.target.value })}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && fieldLinkEdit.url) {
                                        updateEvent(event.id, { fieldUrls: { ...(event.fieldUrls || {}), [fieldKey]: fieldLinkEdit.url } });
                                        setFieldLinkEdit(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => {
                                    if (fieldLinkEdit.url) {
                                      updateEvent(event.id, { fieldUrls: { ...(event.fieldUrls || {}), [fieldKey]: fieldLinkEdit.url } });
                                      setFieldLinkEdit(null);
                                    }
                                  }}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setFieldLinkEdit(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          // Display mode
                          const detailContent = fieldUrl ? (
                            <a href={fieldUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                              {row.details} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span>{row.details}</span>
                          );

                          if (!isEditing || !fieldKey) return detailContent;

                          // Edit mode: show value + action buttons
                          return (
                            <div className="group">
                              {detailContent}
                              <div className="flex gap-1 mt-1 opacity-70 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-xs gap-0.5"
                                  onClick={() => setNotesEdit({ eventId: event.id, field: fieldKey, value: (event as any)[fieldKey] || '' })}
                                >
                                  <Pencil className="h-2.5 w-2.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-xs gap-0.5 text-primary"
                                  onClick={() => setFieldLinkEdit({ eventId: event.id, field: fieldKey, url: fieldUrl || '' })}
                                >
                                  <LinkIcon className="h-2.5 w-2.5" /> {fieldUrl ? 'Edit link' : 'Add link'}
                                </Button>
                                {fieldUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-xs gap-0.5 text-destructive"
                                    onClick={() => {
                                      const updated = { ...(event.fieldUrls || {}) };
                                      delete updated[fieldKey];
                                      updateEvent(event.id, { fieldUrls: updated });
                                    }}
                                  >
                                    <X className="h-2.5 w-2.5" /> Remove link
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      {/* Merged notes/documents cell — only render on first row with rowSpan */}
                      {ri === 0 && (
                        <td className="p-2 align-top text-xs text-muted-foreground" rowSpan={table.rows.length}>
                          {/* Display mode */}
                          {!isEditing && event.links.length > 0 && (
                            <ul className="list-disc list-inside space-y-1">
                              {event.links.map((link, li) => (
                                <li key={li}>
                                  {link.url ? (
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                      <ExternalLink className="h-2.5 w-2.5 inline shrink-0" /> {link.label}
                                    </a>
                                  ) : (
                                    <span>{link.label}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {/* Edit mode */}
                          {isEditing && (
                            <div className="space-y-1">
                              {event.links.map((link, li) => (
                                <div key={li} className="flex items-center gap-1">
                                  {link.url ? (
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 truncate">
                                      <ExternalLink className="h-2.5 w-2.5 shrink-0" /> {link.label}
                                    </a>
                                  ) : (
                                    <span className="truncate">📝 {link.label}</span>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive shrink-0" onClick={() => removeLink(event.id, li)}>
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                              {linkForm?.eventId === event.id ? (
                                <div className="space-y-1 mt-1">
                                  <Input className="h-6 text-xs" placeholder={linkForm.mode === 'link' ? 'Label' : 'Note text'} value={linkForm.label} onChange={e => setLinkForm({ ...linkForm, label: e.target.value })} />
                                  {linkForm.mode === 'link' && (
                                    <Input className="h-6 text-xs" placeholder="https://..." value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} />
                                  )}
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => {
                                      if (linkForm.label) {
                                        addLink(event.id, linkForm.mode === 'link' ? { label: linkForm.label, url: linkForm.url } : { label: linkForm.label });
                                        setLinkForm(null);
                                      }
                                    }}>
                                      <Check className="h-3 w-3 mr-0.5" /> Save
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setLinkForm(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-1 mt-1">
                                  <Button variant="ghost" size="sm" className="h-5 text-xs gap-0.5 text-primary" onClick={() => setLinkForm({ eventId: event.id, label: '', url: '', mode: 'link' })}>
                                    <LinkIcon className="h-2.5 w-2.5" /> Add link
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-5 text-xs gap-0.5" onClick={() => setLinkForm({ eventId: event.id, label: '', url: '', mode: 'note' })}>
                                    <Plus className="h-2.5 w-2.5" /> Add note
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {timeline.length === 0 && (
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
