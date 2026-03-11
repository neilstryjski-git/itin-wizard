import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  Plus, Plane, Trash2, MapPin, Users, Calendar, Mail, Pencil,
  ShieldCheck, Archive, RotateCcw, Lock, LockOpen, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { createNewProject } from '@/types/project';
import { CollaboratorsDialog } from '@/components/CollaboratorsDialog';

type DashboardFilter = 'drafts' | 'finalized' | 'archive';

export default function Dashboard() {
  const { projects, addProject, deleteProject, updateProject, archiveProject, restoreProject, email, isLoading } = useProjectsContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic Home Route Redirection
  useEffect(() => {
    if (isLoading || projects.length === 0) return;
    
    // Only redirect if we are on the base root path
    if (location.pathname === '/') {
      const hasFinalized = projects.some(p => p.metadata.is_finalized === true && p.metadata.status !== 'archived');
      const hasDrafts = projects.some(p => p.metadata.is_finalized !== true && p.metadata.status !== 'archived');
      
      if (hasFinalized) {
        console.log("[Dashboard] Auto-redirecting to /finalized (found finalized trips)");
        navigate('/finalized', { replace: true });
      } else if (!hasDrafts) {
        // This handles cases where only archived trips exist - stay on drafts for creation
        console.log("[Dashboard] Staying on / drafts (no active drafts or finalized found)");
      }
    }
  }, [isLoading, projects, location.pathname, navigate]);

  const filter: DashboardFilter =
    location.pathname === '/finalized' ? 'finalized' :
    location.pathname === '/archive' ? 'archive' :
    'drafts';

  const filteredProjects = projects.filter(p => {
    if (filter === 'finalized') return p.metadata.is_finalized === true && p.metadata.status !== 'archived';
    if (filter === 'archive') return p.metadata.status === 'archived';
    return p.metadata.is_finalized !== true && p.metadata.status !== 'archived';
  });

  const pageTitle = filter === 'finalized' ? 'Finalized Trips' : filter === 'archive' ? 'Archive' : 'Trip Dashboard';
  const pageSubtitle = filter === 'finalized' ? 'Official travel records' : filter === 'archive' ? 'Past and retired trips' : 'Manage your travel projects';

  console.log(`[Dashboard] filter=${filter}, showing ${filteredProjects.length} of ${projects.length} projects for ${email}`);

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
    if (!email) return;
    const p = createNewProject();
    addProject(p, () => navigate(`/project/${p.project_id}/interview`));
  };

  const handleDelete = (projectId: string) => {
    const p = projects.find(proj => proj.project_id === projectId);
    if (!p) return;
    // Official records need confirmation dialog — handled by AlertDialog
    // Draft trips delete immediately
    if (p.metadata.is_finalized || p.metadata.status === 'archived') {
      setDeleteConfirmId(projectId);
    } else {
      deleteProject(projectId);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteProject(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const toggleLock = (projectId: string, currentlyLocked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateProject(projectId, p => ({
      ...p,
      metadata: { ...p.metadata, is_locked: !currentlyLocked }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const deleteTarget = deleteConfirmId ? projects.find(p => p.project_id === deleteConfirmId) : null;
  const isOfficialRecord = deleteTarget?.metadata.is_finalized || deleteTarget?.metadata.status === 'archived';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        {filter === 'drafts' && (
          <Button onClick={handleNewProject} size="lg" className="gap-2">
            <Plus className="h-4 w-4" /> New Trip
          </Button>
        )}
      </div>

      {filteredProjects.length === 0 ? (
        <Card className={`border-dashed border-2 ${filter === 'drafts' ? 'card-hover cursor-pointer' : ''}`} onClick={filter === 'drafts' ? handleNewProject : undefined}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            {filter === 'finalized' ? (
              <>
                <ShieldCheck className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">No finalized trips</p>
                <p className="text-sm">Finalize a trip from the Drafts library to create an official record</p>
              </>
            ) : filter === 'archive' ? (
              <>
                <Archive className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">Archive is empty</p>
                <p className="text-sm">Archived trips will appear here</p>
              </>
            ) : (
              <>
                <Plane className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">No trips yet</p>
                <p className="text-sm">Create your first travel project to get started</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p, i) => {
            const currentEmail = email?.trim().toLowerCase();
            const projectOwnerEmail = p.owner_email?.trim().toLowerCase();
            const isOwner = projectOwnerEmail === currentEmail;
            const collaboratorsCount = p.metadata.collaborators?.length || 0;
            const isTestTrip = p.metadata.name?.startsWith('TEST:') || p.metadata.name?.endsWith(' TEST');
            const isFinalized = p.metadata.is_finalized === true;
            const isArchived = p.metadata.status === 'archived';
            const isLocked = p.metadata.is_locked !== false; // default locked if finalized
            const version = p.metadata.version ?? 1;
            const finalizedAt = p.metadata.finalized_at
              ? new Date(p.metadata.finalized_at).toLocaleDateString('en-CA') // YYYY-MM-DD
              : null;

            const cardBg = isArchived
              ? 'border-muted bg-muted/20'
              : isFinalized
              ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20'
              : isTestTrip
              ? 'border-primary/20 bg-primary/[0.02]'
              : '';

            return (
              <Card
                key={p.project_id}
                className={`card-hover cursor-pointer group relative ${cardBg}`}
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
                            onClick={e => !isLocked || !isFinalized ? startEditing(p.project_id, p.metadata.name || '', e) : e.stopPropagation()}
                          >
                            {p.metadata.name || 'Untitled Trip'}
                            {(!isFinalized || !isLocked) && (
                              <Pencil className="h-3 w-3 opacity-0 group-hover/name:opacity-40 transition-opacity flex-shrink-0" />
                            )}
                          </h3>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {isTestTrip && (
                            <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-muted border border-muted-foreground/20 rounded">Demo</span>
                          )}
                          {!isOwner && (
                            <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded">Shared</span>
                          )}
                          {isFinalized && !isArchived && (
                            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" /> Official
                            </span>
                          )}
                          {isArchived && (
                            <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-muted border border-muted-foreground/20 rounded flex items-center gap-0.5">
                              <Archive className="h-2.5 w-2.5" /> Archived
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Finalized metadata sub-label */}
                      {isFinalized && finalizedAt && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 font-medium">
                          Finalized {finalizedAt} · v.{version}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{p.metadata.destination || 'No destination'}</span>
                      </div>
                    </div>

                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {/* Lock/Unlock toggle for finalized trips (owner only) */}
                      {isFinalized && isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 transition-colors ${isLocked ? 'text-muted-foreground hover:text-amber-600' : 'text-amber-600 hover:text-amber-700'}`}
                          title={isLocked ? 'Unlock for editing' : 'Lock (read-only)'}
                          onClick={e => toggleLock(p.project_id, isLocked, e)}
                        >
                          {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                        </Button>
                      )}

                      <CollaboratorsDialog
                        project={p}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Users className="h-4 w-4" />
                          </Button>
                        }
                      />

                      {/* Archive button for finalized trips (owner only) */}
                      {isFinalized && !isArchived && isOwner && !isLocked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-8 w-8"
                          title="Archive trip"
                          onClick={(e) => { e.stopPropagation(); archiveProject(p.project_id); }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Restore button for archived trips (owner only) */}
                      {isArchived && isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-8 w-8"
                          title="Restore trip"
                          onClick={(e) => { e.stopPropagation(); restoreProject(p.project_id); }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete button */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive h-8 w-8"
                          title="Delete trip"
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.project_id); }}
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
                    {isFinalized && !isLocked && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium ml-auto">
                        <LockOpen className="h-3 w-3" /> Editing
                      </span>
                    )}
                  </div>

                  {!isFinalized && !isArchived && (
                    <div className="flex gap-1.5 mt-4">
                      {[
                        { done: p.phase_1_requirements.completed, label: 'Req' },
                        { done: p.phase_2_itinerary.events.length > 0, label: 'Itin' },
                        { done: p.phase_3_packing.generated, label: 'Pack' },
                      ].map(step => (
                        <span
                          key={step.label}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            step.done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* High-friction delete confirmation for official records */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {isOfficialRecord ? 'Official Record' : 'Trip'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {isOfficialRecord ? (
                <>
                  <strong className="text-foreground block">
                    "{deleteTarget?.metadata.name}" is an official record and cannot be recovered.
                  </strong>
                  <span>This will permanently delete the {deleteTarget?.metadata.is_finalized ? 'finalized' : 'archived'} trip including all itinerary events and packing data.</span>
                </>
              ) : (
                <span>This will permanently delete the trip and all its data.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
