import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Trash2, MapPin, Users, Calendar, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { createNewProject } from '@/types/project';
import { CollaboratorsDialog } from '@/components/CollaboratorsDialog';

export default function Dashboard() {
  const { projects, addProject, deleteProject, email } = useProjectsContext();
  const navigate = useNavigate();

  const handleNewProject = () => {
    const p = createNewProject();
    addProject(p);
    navigate(`/project/${p.project_id}/interview`);
  };

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

            return (
              <Card
                key={p.project_id}
                className="card-hover cursor-pointer group relative"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate(`/project/${p.project_id}/itinerary`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-lg truncate">
                          {p.metadata.name || 'Untitled Trip'}
                        </h3>
                        {!isOwner && (
                          <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded">Shared</span>
                        )}
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
