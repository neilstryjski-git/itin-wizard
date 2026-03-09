import { useState } from 'react';
import { Users, Plus, X, Shield, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TravelProject } from '@/types/project';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { toast } from 'sonner';

interface CollaboratorsDialogProps {
  project: TravelProject;
  trigger?: React.ReactNode;
}

export function CollaboratorsDialog({ project, trigger }: CollaboratorsDialogProps) {
  const { updateProject, email: currentUserEmail } = useProjectsContext();
  const [newEmail, setNewEmail] = useState('');
  const isOwner = project.owner_email === currentUserEmail;

  const addCollaborator = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (trimmed === project.owner_email) {
      toast.error("Owner already has access.");
      return;
    }
    if (project.metadata.collaborators?.includes(trimmed)) {
      toast.error("User already invited.");
      return;
    }

    updateProject(project.project_id, p => ({
      ...p,
      metadata: {
        ...p.metadata,
        collaborators: [...(p.metadata.collaborators || []), trimmed]
      }
    }));
    setNewEmail('');
    toast.success(`Invite sent to ${trimmed}`);
  };

  const removeCollaborator = (email: string) => {
    updateProject(project.project_id, p => ({
      ...p,
      metadata: {
        ...p.metadata,
        collaborators: (p.metadata.collaborators || []).filter(e => e !== email)
      }
    }));
    toast.success(`Removed access for ${email}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Manage Access
          </DialogTitle>
          <DialogDescription>
            Share this itinerary with friends or family. They will have full edit access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" /> Owner
            </h4>
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
              <span className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 opacity-60" /> {project.owner_email}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 border rounded">Owner</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Collaborators
            </h4>
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
              {(!project.metadata.collaborators || project.metadata.collaborators.length === 0) ? (
                <p className="text-xs text-muted-foreground italic py-2">No collaborators added yet.</p>
              ) : (
                project.metadata.collaborators.map(email => (
                  <div key={email} className="flex items-center justify-between bg-secondary/30 p-2 rounded-md text-sm group">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 opacity-60" /> {email}
                    </span>
                    <button 
                      onClick={() => removeCollaborator(email)}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Email address"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCollaborator()}
              type="email"
              className="flex-1"
            />
            <Button onClick={addCollaborator} size="sm" className="gap-1">
              <Plus className="h-3 w-3" /> Invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
