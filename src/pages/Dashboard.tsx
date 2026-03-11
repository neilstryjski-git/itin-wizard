import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Plus, Plane, Trash2, MapPin, Users, Calendar, Mail, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { createNewProject } from '@/types/project';
import { CollaboratorsDialog } from '@/components/CollaboratorsDialog';

export default function Dashboard() {
  const { projects, addProject, deleteProject, updateProject, email, isLoading } = useProjectsContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  console.log(`[Dashboard] Rendering with ${projects.length} projects for ${email}`);

  const startEditing = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      updateProject(id, p => ({ ...p, metadata: { ...p.metadata, name: trimmed } }));
    }
    setEditingId(null);
  };

  const handleNewProject = () => {
    console.log("[Dashboard] Attempting to create new project. Email state:", email);
    if (!email) {
      console.error("[Dashboard] Cannot create project: No email identity found.");
      return;
    }
    const p = createNewProject();
    console.log("[Dashboard] Calling addProject with:", p.project_id);
    addProject(p, () => {
      navigate(`/project/${p.project_id}/interview`);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold">Trip Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your travel projects</p>
        </div>
        <Button onClick={handleNewProject} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> New Trip
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 card-hover cursor-pointer" onClick={handleNewProject}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Plane className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No trips yet</p>
            <p className="text-sm">Create your first travel project to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => {
            const currentEmail = email?.trim().toLowerCase();
            const projectOwnerEmail = p.owner_email?.trim().toLowerCase();
            const isOwner = projectOwnerEmail === currentEmail;
            const collaboratorsCount = p.metadata.collaborators?.length || 0;
            const isTestTrip = p.metadata.name?.startsWith('TEST:') || p.metadata.name?.endsWith(' TEST');

            return (
              <Card
                key={p.project_id}
                className={`card-hover cursor-pointer group relative ${isTestTrip ? 'border-primary/20 bg-primary/[0.02]' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => {
                  const target = p.phase_1_requirements.completed ? 'itinerary' : 'interview';
                  navigate(`/project/${p.project_id}/${target}`);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingId === p.project_id ? (
                          <Input
                            ref={inputRef}
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => commitEdit(p.project_id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); commitEdit(p.project_id); }
                              if (e.key === 'Escape') { setEditingId(null); }
                            }}
                            onClick={e => e.stopPropagation()}
                            className="font-heading font-semibold text-lg h-auto py-0 px-1 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary w-48"
                          />
                        ) : (
                          <h3
                            className="font-heading font-semibold text-lg truncate cursor-text group/name flex items-center gap-1"
                            onClick={e => startEditing(p.project_id, p.metadata.name || '', e)}
                          >
                            {p.metadata.name || 'Untitled Trip'}
                            <Pencil className="h-3 w-3 opacity-0 group-hover/name:opacity-40 transition-opacity flex-shrink-0" />
                          </h3>
                        )}
                        <div className="flex gap-1.5">
                          {isTestTrip && (
                            <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-muted border border-muted-foreground/20 rounded">Demo</span>
                          )}
                          {!isOwner && (
                            <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded">Shared</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{p.metadata.destination || 'No destination'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div onClick={e => e.stopPropagation()}>
                        <CollaboratorsDialog 
                          project={p} 
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Users className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); deleteProject(p.project_id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Number of travelers">
                      <Users className="h-3 w-3" /> {p.metadata.travelers.length || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Total events">
                      <Calendar className="h-3 w-3" /> {p.phase_2_itinerary.events.length}
                    </span>
                    {collaboratorsCount > 0 && (
                      <span className="flex items-center gap-1 text-primary/80 font-medium" title="Collaborators">
                        <Mail className="h-3 w-3" /> {collaboratorsCount}
                      </span>
                    )}
                  </div>

                <div className="flex gap-1.5 mt-4">
                  {[
                    { done: p.phase_1_requirements.completed, label: 'Req' },
                    { done: p.phase_2_itinerary.events.length > 0, label: 'Itin' },
                    { done: p.phase_3_packing.generated, label: 'Pack' },
                  ].map(step => (
                    <span
                      key={step.label}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        step.done
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);
}
