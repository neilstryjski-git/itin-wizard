import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pencil, Save, X, AlertTriangle, Plus, Trash2, Plane, Hotel,
  MapPin, Clock, Link as LinkIcon, FileText, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ItineraryEvent, TravelLink, FileAttachment } from '@/types/project';
import { FileDropZone, AttachmentList } from '@/components/FileDropZone';

const EVENT_ICONS: Record<string, any> = {
  'flight-departure': Plane,
  'flight-arrival': Plane,
  'check-in': Hotel,
  'check-out': Hotel,
  'activity': MapPin,
  'transfer': ArrowRight,
};

const EVENT_LABELS: Record<string, string> = {
  'flight-departure': 'Flight Departure',
  'flight-arrival': 'Flight Arrival',
  'check-in': 'Check-In',
  'check-out': 'Check-Out',
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

  if (!project) { navigate('/'); return null; }

  const events = [...project.phase_2_itinerary.events].sort(
    (a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
  );

  const parseAndAdd = () => {
    if (!rawInput.trim()) return;
    const parsed = parseRawInput(rawInput);
    updateProject(projectId!, p => ({
      ...p,
      phase_2_itinerary: {
        rawInput,
        events: [...p.phase_2_itinerary.events, ...parsed],
      },
    }));
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

      {/* Raw Input */}
      <Card className="mb-8">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Paste reservation details
          </div>
          <Textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Paste your booking confirmations, flight details, hotel reservations here..."
            rows={4}
          />
          <Button size="sm" onClick={parseAndAdd} variant="secondary">
            Parse & Add Events
          </Button>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No events yet. Paste reservation data above or add events manually.
          </p>
        ) : (
          events.map((event, i) => {
            const Icon = EVENT_ICONS[event.type] || MapPin;
            const isEditing = editingId === event.id;
            const missing = hasMissing(event);

            return (
              <Card key={event.id} className="relative slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <EditForm
                      form={editForm}
                      setForm={setEditForm}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        event.type.includes('flight') ? 'bg-primary/10 text-primary' :
                        event.type.includes('check') ? 'bg-accent text-accent-foreground' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {EVENT_LABELS[event.type]}
                          </span>
                          {missing && (
                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                          )}
                        </div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {event.date}{event.time ? ` · ${event.time}` : ''}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </span>
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
          })
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
    <div className="space-y-3">
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
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Time</label>
          <Input type="time" value={form.time || ''} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
      </div>
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
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const lower = line.toLowerCase();
    let type: ItineraryEvent['type'] = 'activity';

    if (/flight|fly|depart/i.test(lower) && /arriv/i.test(lower)) {
      // Both departure and arrival
      events.push({
        id: crypto.randomUUID(), type: 'flight-departure', title: line.trim(),
        date: extractDate(line), time: extractTime(line), links: [],
      });
      events.push({
        id: crypto.randomUUID(), type: 'flight-arrival', title: line.trim(),
        date: extractDate(line), links: [],
      });
      continue;
    } else if (/flight|fly|depart/i.test(lower)) {
      type = 'flight-departure';
    } else if (/arriv|land/i.test(lower)) {
      type = 'flight-arrival';
    } else if (/check.?in|arrival.*hotel|hotel.*arriv/i.test(lower)) {
      type = 'check-in';
    } else if (/check.?out|depart.*hotel|hotel.*depart/i.test(lower)) {
      type = 'check-out';
    } else if (/hotel|resort|stay|airbnb|lodge/i.test(lower)) {
      // Create check-in and check-out
      events.push({
        id: crypto.randomUUID(), type: 'check-in', title: `Check-in: ${line.trim()}`,
        date: extractDate(line), links: [],
      });
      events.push({
        id: crypto.randomUUID(), type: 'check-out', title: `Check-out: ${line.trim()}`,
        date: extractDate(line), links: [],
      });
      continue;
    } else if (/transfer|shuttle|taxi|uber/i.test(lower)) {
      type = 'transfer';
    }

    events.push({
      id: crypto.randomUUID(),
      type,
      title: line.trim(),
      date: extractDate(line),
      time: extractTime(line),
      links: [],
    });
  }

  return events;
}

function extractDate(text: string): string {
  const match = text.match(/\d{4}-\d{2}-\d{2}/) || text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    if (match[0].includes('/')) {
      return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }
    return match[0];
  }
  return new Date().toISOString().split('T')[0];
}

function extractTime(text: string): string | undefined {
  const match = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (match) {
    let hours = parseInt(match[1]);
    if (match[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (match[3]?.toLowerCase() === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}
