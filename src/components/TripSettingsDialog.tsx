import { useState } from 'react';
import { Settings, Plus, X, Calendar, User, Trash2 } from 'lucide-react';
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

interface TripSettingsDialogProps {
  project: TravelProject;
}

export function TripSettingsDialog({ project }: TripSettingsDialogProps) {
  const { updateProject } = useProjectsContext();
  const [name, setName] = useState(project.metadata.name);
  const [startDate, setStartDate] = useState(project.metadata.startDate || '');
  const [endDate, setEndDate] = useState(project.metadata.endDate || '');
  const [travelers, setTravelers] = useState([...project.metadata.travelers]);

  const saveSettings = () => {
    updateProject(project.project_id, p => ({
      ...p,
      metadata: {
        ...p.metadata,
        name,
        startDate,
        endDate,
        travelers
      }
    }));
    toast.success("Trip settings updated.");
  };

  const addTraveler = () => {
    setTravelers([...travelers, { name: '', isMinor: false }]);
  };

  const updateTraveler = (index: number, updates: Partial<typeof travelers[0]>) => {
    const newTravelers = [...travelers];
    newTravelers[index] = { ...newTravelers[index], ...updates };
    setTravelers(newTravelers);
  };

  const removeTraveler = (index: number) => {
    setTravelers(travelers.filter((_, i) => i !== index));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Trip Settings
          </DialogTitle>
          <DialogDescription>
            Update trip-wide details like dates and travelers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General</h4>
            <div className="space-y-2">
              <label className="text-xs font-medium">Trip Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Belize Family Adventure" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Travelers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Travelers</h4>
              <Button variant="ghost" size="sm" onClick={addTraveler} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {travelers.map((t, i) => (
                <div key={i} className="flex gap-2 items-center group">
                  <div className="relative flex-1">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-9" 
                      placeholder="Traveler Name" 
                      value={t.name} 
                      onChange={e => updateTraveler(i, { name: e.target.value })} 
                    />
                  </div>
                  <div className="flex items-center gap-2 px-2 h-10 border rounded-md bg-muted/20">
                    <input 
                      type="checkbox" 
                      id={`minor-${i}`} 
                      checked={t.isMinor} 
                      onChange={e => updateTraveler(i, { isMinor: e.target.checked })} 
                    />
                    <label htmlFor={`minor-${i}`} className="text-xs cursor-pointer select-none">Minor</label>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTraveler(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {travelers.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-2">No travelers added.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={saveSettings} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
