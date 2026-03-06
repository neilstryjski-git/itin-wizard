import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Pencil, Save, X, AlertTriangle, Plus, Trash2, Plane, Hotel,
  MapPin, Clock, Link as LinkIcon, FileText, ArrowRight, Loader2, Sparkles, Check,
  Upload, Image, File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ItineraryEvent, TravelLink, FileAttachment } from '@/types/project';
import { FileDropZone, AttachmentList } from '@/components/FileDropZone';
import { supabase } from '@/integrations/supabase/client';
import { buildTimeline, normalizeDate, eventsFromTimeline, TimelineEntry } from '@/lib/itinerary-utils';
import { SortableList, SortableItem, arrayMove } from '@/components/SortableEventList';

const EVENT_ICONS: Record<string, any> = {
  'flight': Plane,
  'check-in': Hotel,
  'check-out': Hotel,
  'accommodation': Hotel,
  'activity': MapPin,
  'transfer': ArrowRight,
};

const EVENT_LABELS: Record<string, string> = {
  'flight': 'Flight',
  'check-in': 'Accommodation Check-In',
  'check-out': 'Accommodation Check-Out',
  'accommodation': 'Accommodation (Stay)',
  'activity': 'Activity',
  'transfer': 'Transfer',
};

export default function Phase2Itinerary() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject } = useProjectsContext();
  const navigate = useNavigate();
  const project = getProject(projectId!);
  const [rawInput, setRawInput] = useState(project?.phase_2_itinerary.rawInput || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ItineraryEvent>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<Partial<ItineraryEvent>[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<FileAttachment[]>([]);

  const handleDocsAdded = useCallback((files: FileAttachment[]) => {
    setUploadedDocs(prev => [...prev, ...files]);
  }, []);

  const removeDoc = useCallback((id: string) => {
    setUploadedDocs(prev => prev.filter(f => f.id !== id));
  }, []);

  const parseDocuments = useCallback(async () => {
    if (uploadedDocs.length === 0 && !rawInput.trim()) return;
    setIsParsing(true);
    try {
      const files = uploadedDocs.map(d => ({
        data: d.data,
        name: d.name,
        type: d.type,
      }));

      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: {
          text: rawInput.trim() || undefined,
          files: files.length > 0 ? files : undefined,
        },
      });
      if (error) throw error;
      const events: Partial<ItineraryEvent>[] = (data.events || []).map((ev: any) => ({
        ...ev,
        id: crypto.randomUUID(),
        links: ev.links || [],
      }));
      if (events.length === 0) {
        toast.info('No events could be extracted. Try adding more detail.');
        if (rawInput.trim()) {
          const fallback = parseRawInput(rawInput);
          setPreviewEvents(fallback);
        }
      } else {
        setPreviewEvents(events);
        toast.success(`Extracted ${events.length} event(s) from your documents.`);
      }
    } catch (err) {
      console.error('AI parse failed, falling back to regex:', err);
      toast.error('AI parsing unavailable, using local parser.');
      if (rawInput.trim()) {
        const fallback = parseRawInput(rawInput);
        setPreviewEvents(fallback);
      }
    } finally {
      setIsParsing(false);
    }
  }, [uploadedDocs, rawInput]);

  const reorderEntries = useCallback((oldIndex: number, newIndex: number) => {
    updateProject(projectId!, p => {
      const timeline = buildTimeline(p.phase_2_itinerary.events, { preserveOrder: true });
      const reordered = arrayMove([...timeline], oldIndex, newIndex);
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

  const timelineEntries = buildTimeline(project.phase_2_itinerary.events, { preserveOrder: true });

  const parseAndAdd = parseDocuments;

  const confirmPreview = () => {
    const eventsToAdd = previewEvents.map(ev => ({
      id: ev.id || crypto.randomUUID(),
      type: ev.type || 'activity',
      title: ev.title || 'Untitled Event',
      date: normalizeDate(ev.date) || new Date().toISOString().split('T')[0],
      endDate: normalizeDate(ev.endDate) || undefined,
      time: ev.time,
      location: ev.location,
      address: ev.address,
      confirmationCode: ev.confirmationCode,
      flightNumber: ev.flightNumber,
      departureLocation: ev.departureLocation,
      arrivalLocation: ev.arrivalLocation,
      departureTime: ev.departureTime,
      arrivalTime: ev.arrivalTime,
      notes: ev.notes,
      links: ev.links || [],
      attachments: ev.attachments || [],
    } as ItineraryEvent));

    // Sort new events chronologically (soonest first) before adding
    eventsToAdd.sort((a, b) => {
      const dateA = normalizeDate(a.date);
      const dateB = normalizeDate(b.date);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      // Same day: sort by time
      const timeA = a.type === 'flight' ? (a.departureTime || '') : (a.time || '');
      const timeB = b.type === 'flight' ? (b.departureTime || '') : (b.time || '');
      return timeA.localeCompare(timeB);
    });

    updateProject(projectId!, p => {
      // Also sort the combined list chronologically on initial add
      const allEvents = [...p.phase_2_itinerary.events, ...eventsToAdd];
      allEvents.sort((a, b) => {
        const dateA = normalizeDate(a.date);
        const dateB = normalizeDate(b.date);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.type === 'flight' ? (a.departureTime || '') : (a.time || '');
        const timeB = b.type === 'flight' ? (b.departureTime || '') : (b.time || '');
        return timeA.localeCompare(timeB);
      });
      return {
        ...p,
        phase_2_itinerary: {
          rawInput,
          events: allEvents,
        },
      };
    });
    setPreviewEvents([]);
    setUploadedDocs([]);
    setRawInput('');
    toast.success(`${eventsToAdd.length} event(s) added to itinerary.`);
  };

  const cancelPreview = () => {
    setPreviewEvents([]);
  };

  const updatePreviewEvent = (index: number, updates: Partial<ItineraryEvent>) => {
    setPreviewEvents(prev => prev.map((ev, i) => i === index ? { ...ev, ...updates } : ev));
  };

  const removePreviewEvent = (index: number) => {
    setPreviewEvents(prev => prev.filter((_, i) => i !== index));
  };

  const addBlankEvent = () => {
    const newEvent: ItineraryEvent = {
      id: crypto.randomUUID(),
      type: 'activity',
      title: 'New Event',
      date: new Date().toISOString().split('T')[0],
      links: [],
    };
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: [...p.phase_2_itinerary.events, newEvent],
      },
    }));
    setEditingId(newEvent.id);
    setEditForm(newEvent);
  };

  const deleteEvent = (eventId: string) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: p.phase_2_itinerary.events.filter(e => e.id !== eventId),
      },
    }));
  };

  const startEdit = (event: ItineraryEvent) => {
    setEditingId(event.id);
    setEditForm({ ...event });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: p.phase_2_itinerary.events.map(e =>
          e.id === editingId ? { ...e, ...editForm } as ItineraryEvent : e
        ),
      },
    }));
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const hasMissing = (e: ItineraryEvent) => !e.time || e.links.length === 0;

  const addAttachments = (eventId: string, files: FileAttachment[]) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: p.phase_2_itinerary.events.map(e =>
          e.id === eventId ? { ...e, attachments: [...(e.attachments || []), ...files] } : e
        ),
      },
    }));
  };

  const removeAttachment = (eventId: string, attachmentId: string) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        ...p.phase_2_itinerary,
        events: p.phase_2_itinerary.events.map(e =>
          e.id === eventId ? { ...e, attachments: (e.attachments || []).filter(a => a.id !== attachmentId) } : e
        ),
      },
    }));
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Itinerary</h2>
          <p className="text-sm text-muted-foreground">{project.metadata.name || 'Untitled Trip'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addBlankEvent} className="gap-1">
            <Plus className="h-3 w-3" /> Add Event
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => navigate(`/project/${projectId}/packing`)}
          >
            <ArrowRight className="h-3 w-3" /> Packing
          </Button>
        </div>
      </div>

      {/* Step 1: Upload Documents */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Step 1: Upload booking documents
          </div>
          <p className="text-xs text-muted-foreground">
            Upload PDFs, screenshots, or images of your booking confirmations. AI will extract all events automatically.
          </p>
          <FileDropZone onFilesAdded={handleDocsAdded} />
          {uploadedDocs.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {uploadedDocs.map(doc => {
                  const Icon = doc.type.startsWith('image/') ? Image : doc.type.includes('pdf') ? FileText : File;
                  return (
                    <div key={doc.id} className="flex items-center gap-1.5 bg-secondary rounded-md px-2 py-1 text-xs group">
                      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[150px]">{doc.name}</span>
                      <button
                        onClick={() => removeDoc(doc.id)}
                        className="ml-0.5 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional: Paste text */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Or paste reservation details
          </div>
          <Textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Paste your booking confirmations, flight details, hotel reservations here..."
            rows={3}
            disabled={isParsing}
          />
        </CardContent>
      </Card>

      {/* Parse button */}
      <div className="mb-8">
        <Button
          onClick={parseDocuments}
          disabled={isParsing || (uploadedDocs.length === 0 && !rawInput.trim())}
          className="w-full gap-2"
        >
          {isParsing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing documents...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Parse {uploadedDocs.length > 0 ? `${uploadedDocs.length} document(s)` : 'text'} with AI</>
          )}
        </Button>
      </div>

      {/* Preview Step */}
      {previewEvents.length > 0 && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Review parsed events ({previewEvents.length})
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelPreview}>
                  <X className="h-3 w-3 mr-1" /> Discard
                </Button>
                <Button size="sm" onClick={confirmPreview}>
                  <Check className="h-3 w-3 mr-1" /> Add All
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {previewEvents.map((ev, i) => {
                const Icon = EVENT_ICONS[ev.type || 'activity'] || MapPin;
                return (
                  <Card key={ev.id || i} className="bg-background">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <Select value={ev.type || 'activity'} onValueChange={v => updatePreviewEvent(i, { type: v as any })}>
                          <SelectTrigger className="h-7 w-[160px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EVENT_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-7 text-sm font-medium flex-1"
                          value={ev.title || ''}
                          onChange={e => updatePreviewEvent(i, { title: e.target.value })}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removePreviewEvent(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className={`grid gap-2 ${ev.type === 'accommodation' ? 'grid-cols-4' : ev.type === 'flight' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        <Input type="date" className="h-7 text-xs" value={ev.date || ''} onChange={e => updatePreviewEvent(i, { date: e.target.value })} />
                        {ev.type === 'accommodation' && (
                          <Input type="date" className="h-7 text-xs" value={ev.endDate || ''} onChange={e => updatePreviewEvent(i, { endDate: e.target.value })} placeholder="Check-out" />
                        )}
                        {ev.type !== 'flight' && (
                          <>
                            <Input type="time" className="h-7 text-xs" value={ev.time || ''} onChange={e => updatePreviewEvent(i, { time: e.target.value })} />
                            <Input className="h-7 text-xs" placeholder="Location" value={ev.location || ''} onChange={e => updatePreviewEvent(i, { location: e.target.value })} />
                          </>
                        )}
                      </div>
                      {ev.type === 'flight' && (
                        <div className="grid grid-cols-4 gap-2">
                          <Input className="h-7 text-xs" placeholder="Departure city" value={ev.departureLocation || ''} onChange={e => updatePreviewEvent(i, { departureLocation: e.target.value })} />
                          <Input type="time" className="h-7 text-xs" value={ev.departureTime || ''} onChange={e => updatePreviewEvent(i, { departureTime: e.target.value })} />
                          <Input className="h-7 text-xs" placeholder="Arrival city" value={ev.arrivalLocation || ''} onChange={e => updatePreviewEvent(i, { arrivalLocation: e.target.value })} />
                          <Input type="time" className="h-7 text-xs" value={ev.arrivalTime || ''} onChange={e => updatePreviewEvent(i, { arrivalTime: e.target.value })} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input className="h-7 text-xs" placeholder="Confirmation code" value={ev.confirmationCode || ''} onChange={e => updatePreviewEvent(i, { confirmationCode: e.target.value })} />
                        {ev.type === 'flight' && (
                          <Input className="h-7 text-xs" placeholder="Flight #" value={ev.flightNumber || ''} onChange={e => updatePreviewEvent(i, { flightNumber: e.target.value })} />
                        )}
                      </div>
                      {ev.notes && (
                        <Input className="h-7 text-xs" placeholder="Notes" value={ev.notes || ''} onChange={e => updatePreviewEvent(i, { notes: e.target.value })} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {timelineEntries.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No events yet. Paste reservation data above or add events manually.
          </p>
        ) : (
          <SortableList
            items={timelineEntries.map(e => e.entryId)}
            onReorder={reorderEntries}
          >
            {timelineEntries.map((entry, i) => {
              const { event, displayType, displayDate, displayTime, isBookend } = entry;
              const Icon = EVENT_ICONS[displayType] || MapPin;
              const isEditing = editingId === event.id;
              const missing = hasMissing(event);
              const bookendLabel = EVENT_LABELS[displayType] || displayType;
              const isDraggable = true;

              const cardContent = (
                <Card className="relative slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <CardContent className="p-4">
                    {isEditing && !isBookend ? (
                      <EditForm
                        form={editForm}
                        setForm={setEditForm}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                      />
                    ) : (
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          displayType === 'flight' ? 'bg-primary/10 text-primary' :
                          displayType.includes('check') || displayType === 'accommodation' ? 'bg-accent text-accent-foreground' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              {bookendLabel}
                            </span>
                            {isBookend && (
                              <span className="text-xs text-muted-foreground/60 italic">({event.title})</span>
                            )}
                            {missing && (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            )}
                          </div>
                          {!isBookend && <h4 className="font-semibold">{event.title}</h4>}
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            {event.type === 'flight' ? (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {displayDate}
                                </span>
                                {event.departureLocation && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {event.departureLocation} → {event.arrivalLocation || '?'}
                                  </span>
                                )}
                                {event.departureTime && (
                                  <span className="text-xs">{event.departureTime} – {event.arrivalTime || '?'}</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {displayDate}{displayTime ? ` · ${displayTime}` : ''}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {event.location}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {(event.flightNumber || event.confirmationCode) && (
                            <p className="text-xs mt-1 text-muted-foreground">
                              {event.flightNumber && <><span className="font-mono">{event.flightNumber}</span> · </>}
                              {event.confirmationCode && <>Conf: <span className="font-mono">{event.confirmationCode}</span></>}
                            </p>
                          )}
                          {event.address && (
                            <p className="text-xs mt-0.5 text-muted-foreground">📍 {event.address}</p>
                          )}
                          {event.missingFields && event.missingFields.length > 0 && (
                            <p className="text-xs mt-1 text-warning flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Missing: {event.missingFields.join(', ')}
                            </p>
                          )}
                          {event.links.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {event.links.map((link, li) => (
                                <a
                                  key={li}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <LinkIcon className="h-3 w-3" /> {link.label}
                                </a>
                              ))}
                            </div>
                          )}
                          {event.notes && <p className="text-xs mt-2 text-muted-foreground italic">{event.notes}</p>}
                          <AttachmentList
                            attachments={event.attachments || []}
                            onRemove={(attId) => removeAttachment(event.id, attId)}
                          />
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <FileDropZone
                            compact
                            onFilesAdded={(files) => addAttachments(event.id, files)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(event)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEvent(event.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

              if (isDraggable) {
                return (
                  <SortableItem key={entry.entryId} id={entry.entryId}>
                    {cardContent}
                  </SortableItem>
                );
              }
              return <div key={entry.entryId} className="ml-5">{cardContent}</div>;
            })}
          </SortableList>
        )}
      </div>
    </div>
  );
}

function EditForm({
  form, setForm, onSave, onCancel,
}: {
  form: Partial<ItineraryEvent>;
  setForm: (f: Partial<ItineraryEvent>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateWithAI = async (files: FileAttachment[]) => {
    if (files.length === 0) return;
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: {
          files: files.map(f => ({ data: f.data, name: f.name, type: f.type })),
        },
      });
      if (error) throw error;
      
      const parsedEvents = data.events || [];
      if (parsedEvents.length > 0) {
        // Merge the first parsed event into the current form
        const newInfo = parsedEvents[0];
        const merged: Partial<ItineraryEvent> = { ...form };
        
        // Only override if the AI found something new/specific
        if (newInfo.title) merged.title = newInfo.title;
        if (newInfo.date) merged.date = normalizeDate(newInfo.date);
        if (newInfo.endDate) merged.endDate = normalizeDate(newInfo.endDate);
        if (newInfo.time) merged.time = newInfo.time;
        if (newInfo.location) merged.location = newInfo.location;
        if (newInfo.address) merged.address = newInfo.address;
        if (newInfo.confirmationCode) merged.confirmationCode = newInfo.confirmationCode;
        if (newInfo.flightNumber) merged.flightNumber = newInfo.flightNumber;
        if (newInfo.departureLocation) merged.departureLocation = newInfo.departureLocation;
        if (newInfo.departureTime) merged.departureTime = newInfo.departureTime;
        if (newInfo.arrivalLocation) merged.arrivalLocation = newInfo.arrivalLocation;
        if (newInfo.arrivalTime) merged.arrivalTime = newInfo.arrivalTime;
        
        if (newInfo.links && newInfo.links.length > 0) {
          merged.links = [...(merged.links || []), ...newInfo.links];
        }
        
        if (newInfo.notes) {
          merged.notes = merged.notes ? `${merged.notes}; ${newInfo.notes}` : newInfo.notes;
        }

        setForm(merged);
        toast.success("Event updated with data from your document.");
      } else {
        toast.info("No event data found in that document.");
      }
    } catch (err) {
      console.error("AI Update failed:", err);
      toast.error("Could not update with AI.");
    } finally {
      setIsUpdating(false);
    }
  };

  const addLink = () => {
    setForm({ ...form, links: [...(form.links || []), { label: '', url: '' }] });
  };

  const updateLink = (i: number, field: keyof TravelLink, value: string) => {
    const links = [...(form.links || [])];
    links[i] = { ...links[i], [field]: value };
    setForm({ ...form, links });
  };

  const removeLink = (i: number) => {
    setForm({ ...form, links: (form.links || []).filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Update details from a new document?
        </div>
        <FileDropZone 
          compact 
          onFilesAdded={updateWithAI}
          disabled={isUpdating}
        />
      </div>
      {isUpdating && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary animate-pulse py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing document...
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
      </div>
      {form.type === 'flight' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Flight #</label>
              <Input value={form.flightNumber || ''} onChange={e => setForm({ ...form, flightNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Departure City</label>
              <Input value={form.departureLocation || ''} onChange={e => setForm({ ...form, departureLocation: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Departure Time</label>
              <Input type="time" value={form.departureTime || ''} onChange={e => setForm({ ...form, departureTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Arrival City</label>
              <Input value={form.arrivalLocation || ''} onChange={e => setForm({ ...form, arrivalLocation: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Arrival Time</label>
              <Input type="time" value={form.arrivalTime || ''} onChange={e => setForm({ ...form, arrivalTime: e.target.value })} />
            </div>
          </div>
        </>
      ) : (
        <div className={`grid gap-3 ${form.type === 'accommodation' ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{form.type === 'accommodation' ? 'Check-in Date' : 'Date'}</label>
            <Input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          {form.type === 'accommodation' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Check-out Date</label>
              <Input type="date" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Time</label>
            <Input type="time" value={form.time || ''} onChange={e => setForm({ ...form, time: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Confirmation Code</label>
        <Input value={form.confirmationCode || ''} onChange={e => setForm({ ...form, confirmationCode: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">Links</label>
          <Button variant="ghost" size="sm" onClick={addLink} className="h-6 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add Link
          </Button>
        </div>
        {(form.links || []).map((link, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <Input placeholder="Label" value={link.label} onChange={e => updateLink(i, 'label', e.target.value)} className="flex-1" />
            <Input placeholder="URL" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} className="flex-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeLink(i)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Attachments</label>
        <div className="mt-1">
          <FileDropZone onFilesAdded={(files) => {
            setForm({ ...form, attachments: [...(form.attachments || []), ...files] });
          }} />
        </div>
        <AttachmentList
          attachments={form.attachments || []}
          onRemove={(attId) => {
            setForm({ ...form, attachments: (form.attachments || []).filter(a => a.id !== attId) });
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} className="gap-1"><Save className="h-3 w-3" /> Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3 w-3" /> Cancel</Button>
      </div>
    </div>
  );
}

function parseRawInput(text: string): ItineraryEvent[] {
  const events: ItineraryEvent[] = [];

  // Split into blocks separated by blank lines, or treat each line as a block
  const blocks = text.includes('\n\n')
    ? text.split(/\n\s*\n/).filter(b => b.trim())
    : text.split('\n').filter(l => l.trim()).map(l => l);

  for (const block of blocks) {
    const fullText = block.trim();
    const lower = fullText.toLowerCase();

    // Extract all structured data from the block
    const date = extractDate(fullText);
    const time = extractTime(fullText);
    const confirmation = extractConfirmation(fullText);
    const flightNumber = extractFlightNumber(fullText);
    const location = extractLocation(fullText);
    const address = extractAddress(fullText);
    const links = extractUrls(fullText);
    const title = extractTitle(fullText);

    // Determine event type
    if (/flight|fly|airline|air\s|depart.*flight/i.test(lower)) {
      events.push({
        id: crypto.randomUUID(), type: 'flight', title: title || 'Flight',
        date, departureLocation: location, departureTime: time,
        flightNumber, confirmationCode: confirmation, links,
      });
    } else if (/check.?in|check.?out|hotel|resort|stay|airbnb|lodge|inn|hostel|villa/i.test(lower)) {
      const dates = extractDateRange(fullText);
      events.push({
        id: crypto.randomUUID(), type: 'accommodation',
        title: title || 'Accommodation',
        date: dates[0] || date, endDate: dates[1] !== dates[0] ? dates[1] : undefined,
        time: time || '15:00', location, address, confirmationCode: confirmation, links,
      });
    } else if (/transfer|shuttle|taxi|uber|lyft|pickup|drop.?off/i.test(lower)) {
      events.push({
        id: crypto.randomUUID(), type: 'transfer', title: title || 'Transfer',
        date, time, location, confirmationCode: confirmation, links,
      });
    } else {
      events.push({
        id: crypto.randomUUID(), type: 'activity', title: title || fullText.split('\n')[0],
        date, time, location, address, confirmationCode: confirmation, links,
        notes: extractNotes(fullText),
      });
    }
  }

  return events;
}

function extractDate(text: string): string {
  // ISO format: 2026-03-10
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  // US format: 03/10/2026 or 3/10/2026
  const us = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;

  // Written format: March 10, 2026 or Mar 10 2026
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const written = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})/i);
  if (written) {
    const m = months[written[1].toLowerCase().slice(0, 3)];
    return `${written[3]}-${m}-${written[2].padStart(2, '0')}`;
  }

  // Day Month Year: 10 March 2026
  const dmy = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})/i);
  if (dmy) {
    const m = months[dmy[2].toLowerCase().slice(0, 3)];
    return `${dmy[3]}-${m}-${dmy[1].padStart(2, '0')}`;
  }

  return new Date().toISOString().split('T')[0];
}

function extractDateRange(text: string): [string, string] {
  const dates: string[] = [];

  // Find all ISO dates
  const isoMatches = text.matchAll(/\d{4}-\d{2}-\d{2}/g);
  for (const m of isoMatches) dates.push(m[0]);
  if (dates.length >= 2) return [dates[0], dates[1]];

  // Find written date ranges like "March 10 - March 15, 2026"
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const rangeMatch = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\s*[-–—to]+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i
  );
  if (rangeMatch) {
    const m1 = months[rangeMatch[1].toLowerCase().slice(0, 3)];
    const m2 = rangeMatch[3] ? months[rangeMatch[3].toLowerCase().slice(0, 3)] : m1;
    return [
      `${rangeMatch[5]}-${m1}-${rangeMatch[2].padStart(2, '0')}`,
      `${rangeMatch[5]}-${m2}-${rangeMatch[4].padStart(2, '0')}`,
    ];
  }

  const d = extractDate(text);
  return [d, d];
}

function extractTime(text: string): string | undefined {
  // 23:55, 11:55 PM, 3:00pm
  const match = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?\b/);
  if (match) {
    let hours = parseInt(match[1]);
    const ampm = match[3]?.toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

function extractConfirmation(text: string): string | undefined {
  // Common patterns: Confirmation: XJ882K, Conf#: ABC123, Booking ref: XYZ
  const confMatch = text.match(/(?:confirmation|conf\.?|booking\s*(?:ref|#|number|no)|reservation\s*(?:#|number|no)|PNR|record\s*locator)\s*[:#]\s*([A-Z0-9]{4,10})/i);
  if (confMatch) return confMatch[1].toUpperCase();

  // Standalone 6-char alphanumeric that looks like a booking code (has both letters and numbers)
  const standalone = text.match(/\b([A-Z]{1,2}\d{3,4}[A-Z]?|[A-Z0-9]{6})\b/);
  if (standalone && /[A-Z]/.test(standalone[1]) && /\d/.test(standalone[1]) && standalone[1].length === 6) {
    return standalone[1];
  }

  return undefined;
}

function extractFlightNumber(text: string): string | undefined {
  // AC1234, WS 302, UA 456, etc.
  const match = text.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
  if (match) return `${match[1]}${match[2]}`;
  return undefined;
}

function extractLocation(text: string): string | undefined {
  // Airport codes: YYZ, LAX, BZE (3-letter uppercase in parens or standalone)
  const airportMatch = text.match(/\b([A-Z]{3})\s*(?:\(([^)]+)\))?/);

  // "at Location", "from Location", "to Location", "in Location"
  const prepMatch = text.match(/\b(?:at|from|to|in|@)\s+([A-Z][A-Za-z\s,]+?)(?:\s*[-–|,\n]|$)/);

  // Location: Something
  const labelMatch = text.match(/(?:location|place|venue|airport)[:\s]+(.+?)(?:\n|$)/i);

  if (labelMatch) return labelMatch[1].trim();
  if (prepMatch) return prepMatch[1].trim();
  if (airportMatch && airportMatch[2]) return `${airportMatch[1]} (${airportMatch[2]})`;

  return undefined;
}

function extractAddress(text: string): string | undefined {
  const match = text.match(/(?:address|addr|street|located at)[:\s]+(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();

  // Street address pattern: number + street name
  const streetMatch = text.match(/\b(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Pl|Place)\.?)/i);
  if (streetMatch) return streetMatch[1].trim();

  return undefined;
}

function extractUrls(text: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const urlRegex = /(https?:\/\/[^\s,)]+)/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    // Try to find a label before the URL
    const before = text.slice(Math.max(0, match.index - 60), match.index);
    const labelMatch = before.match(/([A-Za-z][A-Za-z\s]+?)(?:\s*[-:–]\s*|\s+)$/);
    const label = labelMatch ? labelMatch[1].trim() : new URL(url).hostname;
    links.push({ label, url });
  }
  return links;
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0].trim();
  let title = firstLine
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s*\d{4}/gi, '')
    .replace(/\d{1,2}:\d{2}\s*(am|pm)?/gi, '')
    .replace(/(?:confirmation|conf\.?|booking\s*ref)[:\s#]*[A-Z0-9]+/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b(departing|arriving|from|to|at)\b/gi, '')
    .replace(/\b[A-Z]{2}\d{1,4}\b/g, '') // strip flight numbers
    .replace(/\b[A-Z]{3}\s*\([^)]+\)/g, '') // strip airport codes with city
    .replace(/\s{2,}/g, ' ')
    .trim();

  title = title.replace(/^[-–|,\s]+|[-–|,\s]+$/g, '').trim();
  return title || firstLine;
  return title || firstLine;
}

function extractNotes(text: string): string | undefined {
  const lines = text.split('\n').slice(1).filter(l => l.trim());
  // Filter out lines that are purely dates, urls, or confirmation codes
  const noteLines = lines.filter(l => {
    const trimmed = l.trim();
    if (/^https?:\/\//.test(trimmed)) return false;
    if (/^(?:confirm|conf|booking|date|time|location|address)/i.test(trimmed)) return false;
    return true;
  });
  return noteLines.length > 0 ? noteLines.join('; ').slice(0, 200) : undefined;
}
