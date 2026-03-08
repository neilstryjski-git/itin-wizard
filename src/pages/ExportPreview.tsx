import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, ArrowLeft, Plus, X, Pencil, Check, Link as LinkIcon,
  ExternalLink, Sparkles, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ItineraryEvent, TravelLink, FileAttachment } from '@/types/project';
import {
  EVENT_EMOJI, EVENT_TYPE_LABELS, formatDate, formatTime, normalizeDate,
  buildEventTable, getEventTitle, getEventTitlePdf, stripEmoji, buildTimeline, googleMapsUrl, eventsFromTimeline,
} from '@/lib/itinerary-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { SortableList, SortableItem, arrayMove } from '@/components/SortableEventList';
import { supabase } from '@/integrations/supabase/client';
import { FileDropZone } from '@/components/FileDropZone';

export default function ExportPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject } = useProjectsContext();
  const navigate = useNavigate();
  const project = getProject(projectId!);

  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [isUpdatingAI, setIsUpdatingAI] = useState<string | null>(null);
  const [parsingEventId, setParsingEventId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState<{ eventId: string; label: string; url: string; mode: 'link' | 'note' } | null>(null);
  const [notesEdit, setNotesEdit] = useState<{ eventId: string; field: string; value: string } | null>(null);
  const [fieldLinkEdit, setFieldLinkEdit] = useState<{ eventId: string; field: string; url: string } | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryForm, setSummaryForm] = useState<{ notes: string; links: TravelLink[] }>({ notes: '', links: [] });

  const startEditSummary = () => {
    setSummaryForm({
      notes: project?.phase_2_itinerary.summary?.notes || '',
      links: [...(project?.phase_2_itinerary.summary?.links || [])],
    });
    setEditingSummary(true);
  };

  const saveSummaryEdit = () => {
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        summary: summaryForm,
      },
    }));
    setEditingSummary(false);
  };

  const reorderEntries = useCallback((oldIndex: number, newIndex: number) => {
    updateProject(projectId!, p => {
      const tl = buildTimeline(p.phase_2_itinerary.events, { preserveOrder: true });
      const reordered = arrayMove([...tl], oldIndex, newIndex);
      return {
        ...p,
        phase_2_itinerary: {
          ...p.phase_2_itinerary,
          events: eventsFromTimeline(reordered),
        },
      };
    });
  }, [projectId, updateProject]);

  if (!project) { navigate('/'); return null; }

  const timeline = buildTimeline(project.phase_2_itinerary.events, { preserveOrder: true });

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

  const handleEventAIUpdate = async (eventId: string, files: FileAttachment[]) => {
    if (files.length === 0) return;
    setParsingEventId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: {
          files: files.map(f => ({ data: f.data, name: f.name, type: f.type })),
        },
      });
      if (error) throw error;
      
      const parsedEvents = data.events || [];
      if (parsedEvents.length > 0) {
        const newInfo = parsedEvents[0];
        const event = project.phase_2_itinerary.events.find(e => e.id === eventId);
        if (!event) return;

        const updates: Partial<ItineraryEvent> = { ...event };
        
        // Sparse Merge
        if (!updates.title || updates.title === 'New Event' || updates.title === 'Untitled Event') {
          if (newInfo.title) updates.title = newInfo.title;
        }
        
        if (newInfo.date) updates.date = normalizeDate(newInfo.date);
        if (newInfo.time && !updates.time) updates.time = newInfo.time;
        if (newInfo.location && !updates.location) updates.location = newInfo.location;
        if (newInfo.address && !updates.address) updates.address = newInfo.address;
        if (newInfo.confirmationCode) updates.confirmationCode = newInfo.confirmationCode;
        if (newInfo.flightNumber) updates.flightNumber = newInfo.flightNumber;
        
        if (newInfo.links && newInfo.links.length > 0) {
          updates.links = [...(updates.links || []), ...newInfo.links];
        }
        
        if (newInfo.notes) {
          updates.notes = updates.notes ? `${updates.notes}\n---\n${newInfo.notes}` : newInfo.notes;
        }

        updateEvent(eventId, updates);
        toast.success("Event updated with AI data from your document.");
      } else {
        toast.info("No event data found in that document.");
      }
    } catch (err) {
      console.error("AI Update failed:", err);
      toast.error("Could not update with AI.");
    } finally {
      setParsingEventId(null);
    }
  };

  const handleAIUpdate = async (eventId: string, files: FileAttachment[]) => {
    if (files.length === 0) return;
    setIsUpdatingAI(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: {
          files: files.map(f => ({ data: f.data, name: f.name, type: f.type })),
        },
      });
      if (error) throw error;
      
      const parsedEvents = data.events || [];
      if (parsedEvents.length > 0) {
        const newInfo = parsedEvents[0];
        const event = project.phase_2_itinerary.events.find(e => e.id === eventId);
        if (!event) return;

        const updates: Partial<ItineraryEvent> = { ...event };
        
        // Sparse Merge
        if (!updates.title || updates.title === 'New Event' || updates.title === 'Untitled Event') {
          if (newInfo.title) updates.title = newInfo.title;
        }
        
        if (newInfo.date) updates.date = normalizeDate(newInfo.date);
        if (newInfo.endDate) updates.endDate = normalizeDate(newInfo.endDate);
        if (newInfo.time && !updates.time) updates.time = newInfo.time;
        if (newInfo.location && !updates.location) updates.location = newInfo.location;
        if (newInfo.address && !updates.address) updates.address = newInfo.address;
        if (newInfo.confirmationCode) updates.confirmationCode = newInfo.confirmationCode;
        if (newInfo.flightNumber) updates.flightNumber = newInfo.flightNumber;
        
        if (newInfo.links && newInfo.links.length > 0) {
          updates.links = [...(updates.links || []), ...newInfo.links];
        }
        
        if (newInfo.notes) {
          updates.notes = updates.notes ? `${updates.notes}\n---\n${newInfo.notes}` : newInfo.notes;
        }

        updateEvent(eventId, updates);
        toast.success("Details updated from document.");
      } else {
        toast.info("No data found in that document.");
      }
    } catch (err) {
      console.error("AI Update failed:", err);
      toast.error("Could not update.");
    } finally {
      setIsUpdatingAI(null);
    }
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

    if (project.phase_2_itinerary.summary && (project.phase_2_itinerary.summary.notes || project.phase_2_itinerary.summary.links.length > 0)) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Trip Summary & Resources:', margin, y);
      y += 5;

      if (project.phase_2_itinerary.summary.notes) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        const splitNotes = doc.splitTextToSize(project.phase_2_itinerary.summary.notes, pageWidth - margin * 2);
        doc.text(splitNotes, margin, y);
        y += (splitNotes.length * 4) + 2;
      }

      if (project.phase_2_itinerary.summary.links.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        project.phase_2_itinerary.summary.links.forEach(link => {
          if (y > 270) { doc.addPage(); y = 15; }
          const linkText = `• ${link.label}${link.url ? `: ${link.url}` : ''}`;
          const splitLink = doc.splitTextToSize(linkText, pageWidth - margin * 2);
          doc.text(splitLink, margin, y);
          if (link.url) {
            doc.link(margin, y - 3, pageWidth - margin * 2, 4, { url: link.url });
          }
          y += (splitLink.length * 4);
        });
        y += 4;
      }
    }

    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    for (const entry of timeline) {
      const event = entry.event;
      if (y > 250) { doc.addPage(); y = 15; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(getEventTitlePdf(event), margin, y);
      y += 2;

      const table = buildEventTable(event);
      const pdfNotes = stripEmoji(table.notes);

      // Build a map of field URLs and location auto-links for clickable PDF links
      const fieldMap: Record<string, string> = {
        'Location': 'location', 'Departure': 'departureLocation', 'Arrival': 'arrivalLocation',
      };
      const detailUrls: Record<number, string> = {};
      table.rows.forEach((r, i) => {
        const fk = fieldMap[r.field];
        const fieldUrl = fk && event.fieldUrls?.[fk];
        const isLoc = ['Location', 'Departure', 'Arrival'].includes(r.field);
        const url = fieldUrl || (isLoc && r.details ? googleMapsUrl(r.details) : '');
        if (url) detailUrls[i] = url;
      });

      // Collect link URLs from notes column
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
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 55 } },
        styles: { overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200] },
        didDrawCell: (data: any) => {
          if (data.section !== 'body') return;
          // Make Details column cells clickable
          if (data.column.index === 1 && detailUrls[data.row.index]) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: detailUrls[data.row.index], newWindow: true });
            // Draw text in blue to indicate it's a link
            doc.setTextColor(30, 90, 200);
            doc.setFontSize(8);
            doc.text(data.cell.text.join(' '), data.cell.x + 2.5, data.cell.y + data.cell.height / 2 + 1);
            doc.setTextColor(0, 0, 0);
          }
          // Make Notes/Documents column clickable per-link
          if (data.column.index === 2 && data.row.index === 0 && linkUrls.some(u => u)) {
            // Add link annotations for each line in the notes cell
            const lineHeight = 3.5;
            let cy = data.cell.y + 2.5;
            linkUrls.forEach((url) => {
              if (url) {
                doc.link(data.cell.x, cy - 1.5, data.cell.width, lineHeight, { url, newWindow: true });
              }
              cy += lineHeight;
            });
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (project.phase_1_requirements.checklist.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Requirements Checklist', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['', 'Item', 'Notes']],
        body: project.phase_1_requirements.checklist.map(item => [item.checked ? 'Y' : '-', item.title, item.description || '']),
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
      doc.text('Packing List', margin, y);
      y += 2;
      const cats = [...new Set(project.phase_3_packing.items.map(i => i.category))].sort();
      const packRows = cats.flatMap(cat => [
        [{ content: cat, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] as [number, number, number] } }],
        ...project.phase_3_packing.items.filter(i => i.category === cat).map(item => [item.checked ? 'Y' : '-', item.name, item.assignedTo || '']),
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

        {/* Trip Summary Section */}
        <div className="mt-4 pt-4 border-t border-border group">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Trip Summary & Resources
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => editingSummary ? saveSummaryEdit() : startEditSummary()}
            >
              {editingSummary ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
            </Button>
          </div>

          {editingSummary ? (
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
              <div>
                <label className="text-xs font-medium text-muted-foreground">General Trip Notes</label>
                <Textarea
                  value={summaryForm.notes}
                  onChange={e => setSummaryForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="General info, packing reminders, or shared documents..."
                  className="min-h-[100px] mt-1 text-sm bg-background"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Trip-wide Links</label>
                  <Button variant="ghost" size="sm" onClick={() => setSummaryForm(prev => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }))} className="h-6 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Add Link
                  </Button>
                </div>
                {summaryForm.links.map((link, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <Input placeholder="Label" value={link.label} onChange={e => {
                      const links = [...summaryForm.links];
                      links[i].label = e.target.value;
                      setSummaryForm(prev => ({ ...prev, links }));
                    }} className="h-8 text-sm flex-1 bg-background" />
                    <Input placeholder="URL" value={link.url} onChange={e => {
                      const links = [...summaryForm.links];
                      links[i].url = e.target.value;
                      setSummaryForm(prev => ({ ...prev, links }));
                    }} className="h-8 text-sm flex-1 bg-background" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => {
                      const links = summaryForm.links.filter((_, idx) => idx !== i);
                      setSummaryForm(prev => ({ ...prev, links }));
                    }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditingSummary(false)}>Cancel</Button>
                <Button size="sm" onClick={saveSummaryEdit}>Save Summary</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {project.phase_2_itinerary.summary?.notes ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap italic border-l-2 border-primary/20 pl-3 py-1 bg-primary/5 rounded-r">
                  {project.phase_2_itinerary.summary.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No trip-wide notes added yet.</p>
              )}
              {project.phase_2_itinerary.summary?.links && project.phase_2_itinerary.summary.links.length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {project.phase_2_itinerary.summary.links.map((link, li) => (
                    <li key={li} className="text-sm">
                      {link.url ? (
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" /> {link.label}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <hr className="my-4 border-border" />

        {/* Events */}
        <SortableList
          items={timeline.map(e => e.entryId)}
          onReorder={reorderEntries}
        >
          {timeline.map((entry, idx) => {
            const event = entry.event;
            const table = buildEventTable(event, entry.isBookend);
            const isEditing = editingEvent === event.id;
            const isDraggable = true;

            const eventContent = (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{getEventTitle(event)}</h3>
                    {parsingEventId === event.id && (
                      <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditingEvent(isEditing ? null : event.id)}
                    disabled={!!parsingEventId}
                  >
                    {isEditing ? <><Check className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /> Edit</>}
                  </Button>
                </div>

                {isUpdatingAI === event.id && (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary animate-pulse py-2 mb-2 bg-primary/5 rounded border border-primary/10">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing document...
                  </div>
                )}

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

                            if (isEditing && notesEdit?.eventId === event.id && notesEdit.field === fieldKey) {
                              const isNotes = fieldKey === 'notes';
                              return (
                                <div className="flex flex-col gap-2">
                                  {isNotes ? (
                                    <Textarea
                                      className="text-xs min-h-[80px]"
                                      value={notesEdit.value}
                                      onChange={e => setNotesEdit({ ...notesEdit, value: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && saveNotesEdit()}
                                      autoFocus
                                    />
                                  ) : (
                                    <Input
                                      className="h-7 text-xs"
                                      value={notesEdit.value}
                                      onChange={e => setNotesEdit({ ...notesEdit, value: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && saveNotesEdit()}
                                      autoFocus
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" className="h-7 px-2" onClick={saveNotesEdit}>
                                      <Check className="h-3 w-3 mr-1" /> Save
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setNotesEdit(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

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

                            const isLocationField = ['Location', 'Departure', 'Arrival'].includes(row.field);
                            const effectiveUrl = fieldUrl || (isLocationField && row.details ? googleMapsUrl(row.details) : '');
                            const isNotesField = row.field === 'Details';
                            
                            const detailContent = effectiveUrl ? (
                              <a href={effectiveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                {row.details} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            ) : (
                              <span className={isNotesField ? "whitespace-pre-wrap" : ""}>{row.details}</span>
                            );

                            if (!isEditing || !fieldKey) return detailContent;

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
                        {ri === 0 && (
                          <td className="p-2 align-top text-xs text-muted-foreground" rowSpan={table.rows.length}>
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

            if (isDraggable) {
              return (
                <SortableItem key={entry.entryId} id={entry.entryId}>
                  {eventContent}
                </SortableItem>
              );
            }
            return <div key={entry.entryId} className="ml-5">{eventContent}</div>;
          })}
        </SortableList>

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
