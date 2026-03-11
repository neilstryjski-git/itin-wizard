import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TravelProject } from '@/types/project';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { SEED_PROJECT } from '@/data/seed';

function projectsQueryKey(email: string) {
  return ['projects', email];
}

const LEGACY_STORAGE_KEY = 'travel-projects';

interface ProjectCollaboratorLink {
  project_id: string;
}

export function useProjects(email: string | null) {
  const queryClient = useQueryClient();
  const creationInFlight = useRef<string | null>(null);

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: projectsQueryKey(email ?? ''),
    queryFn: async () => {
      if (!email) return [];
      const normalizedEmail = email.trim().toLowerCase();
      console.log("[useProjects] Fetching for:", normalizedEmail);
      
      // 1. Fetch projects where user is owner
      const { data: owned, error: ownedErr } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_email', normalizedEmail);
      
      if (ownedErr) {
        console.error("[useProjects] Error fetching owned projects:", ownedErr);
        throw ownedErr;
      }

      // 2. Fetch projects where user is a collaborator (from JSON data)
      const { data: sharedJson, error: sharedJsonErr } = await supabase
        .from('projects')
        .select('*')
        .contains('data', { metadata: { collaborators: [normalizedEmail] } });

      if (sharedJsonErr) {
        console.error("[useProjects] Error fetching shared JSON projects:", sharedJsonErr);
        // We don't throw here to allow other projects to load, or we could.
      }

      // 3. Fetch projects where user is a collaborator (from collaborators table)
      let sharedTable: Tables<'projects'>[] = [];
      try {
        const { data: sharedTableLinks, error: tableErr } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_email', normalizedEmail);
        
        if (tableErr) {
          // Check for 404/PGRST116/etc which often means table missing
          if (tableErr.code === 'PGRST116' || tableErr.status === 404) {
            console.warn("[useProjects] project_collaborators table not found. Skipping table-based shared fetch.");
          } else {
            console.error("[useProjects] Error fetching collaborator table links:", tableErr);
          }
        } else if (sharedTableLinks && (sharedTableLinks as unknown as ProjectCollaboratorLink[]).length > 0) {
          const links = sharedTableLinks as unknown as ProjectCollaboratorLink[];
          const ids = links.map(l => l.project_id);
          const { data: tableProjects, error: tableProjErr } = await supabase
            .from('projects')
            .select('*')
            .in('project_id', ids);
          if (tableProjErr) {
            console.error("[useProjects] Error fetching shared projects from IDs:", tableProjErr);
          } else if (tableProjects) {
            sharedTable = tableProjects as Tables<'projects'>[];
          }
        }
      } catch (err) {
        console.warn("[useProjects] project_collaborators table fetch failed (likely table missing).", err);
      }

      // 4. Combine and deduplicate by project_id
      const allRows = [...(owned || []), ...(sharedJson || []), ...sharedTable];
      const uniqueRows = Array.from(new Map(allRows.map(r => [r.project_id, r])).values());
      
      const finalProjects = uniqueRows.map(row => ({
        ...(row.data as unknown as TravelProject),
        owner_email: row.owner_email
      }));

      console.log(`[useProjects] Found ${finalProjects.length} total projects for ${normalizedEmail}`);
      return finalProjects;
    },
    enabled: !!email,
  });

  const addMutation = useMutation({
    mutationFn: async (project: TravelProject) => {
      console.log("[addMutation] Inserting project:", project.project_id, "for owner:", email);
      if (!email) throw new Error("No owner email provided");

      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.from('projects').insert([{
        project_id: project.project_id,
        owner_email: normalizedEmail,
        data: JSON.parse(JSON.stringify(project)),
      }]);
      
      if (error) {
        console.error("[addMutation] Supabase error:", error);
        throw error;
      }
      return project;
    },
    onSuccess: (newProject) => {
      const normalizedEmail = email!.trim().toLowerCase();
      console.log("[addMutation] Success! Updating cache and forcing refetch for:", normalizedEmail);
      
      queryClient.setQueryData(projectsQueryKey(normalizedEmail), (old: TravelProject[] = []) => {
        const exists = old.some(p => p.project_id === newProject.project_id);
        if (exists) return old;
        return [newProject, ...old];
      });

      queryClient.invalidateQueries({ queryKey: projectsQueryKey(normalizedEmail) });
      queryClient.refetchQueries({ queryKey: projectsQueryKey(normalizedEmail) });
    },
  });

  // Migration Bridge
  useEffect(() => {
    if (!email || isLoading) return;

    const migrate = async () => {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyData) return;

      try {
        const localProjects: TravelProject[] = JSON.parse(legacyData);
        if (!Array.isArray(localProjects) || localProjects.length === 0) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          return;
        }

        toast.info(`Found ${localProjects.length} local trips. Syncing to your account...`);

        for (const lp of localProjects) {
          // Check if it already exists in the fetched projects (already owned or shared)
          const exists = projects.some(p => p.project_id === lp.project_id);
          if (!exists) {
            console.log(`[Migration] Attempting to sync project: ${lp.project_id}`);
            const { error: insertErr } = await supabase.from('projects').insert([{
              project_id: lp.project_id,
              owner_email: email,
              data: JSON.parse(JSON.stringify(lp)),
            }]);
            
            if (insertErr) {
              if (insertErr.code === '23505') {
                console.warn(`[Migration] Project ${lp.project_id} already exists in DB (owned by someone else). Skipping.`);
              } else {
                console.error(`[Migration] Error syncing project ${lp.project_id}:`, insertErr);
                throw insertErr;
              }
            } else {
              // Sync collaborators from migrated project only if insert was successful
              if (lp.metadata.collaborators && lp.metadata.collaborators.length > 0) {
                const collaborators = lp.metadata.collaborators.map(c => ({
                  project_id: lp.project_id,
                  user_email: c.trim().toLowerCase()
                }));
                await supabase.from('project_collaborators').upsert(collaborators, { onConflict: 'project_id,user_email' });
              }
            }
          }
        }

        localStorage.removeItem(LEGACY_STORAGE_KEY);
        queryClient.invalidateQueries({ queryKey: projectsQueryKey(email) });
        toast.success("Local trips synced successfully!");
      } catch (err) {
        console.error("Migration failed:", err);
      }
    };

    migrate();
  }, [email, isLoading, projects, queryClient]);

  // Test Trip Bridge for New Users
  useEffect(() => {
    if (!email || isLoading || isError) return;

    const normalizedEmail = email.trim().toLowerCase();
    const TEST_TRIP_KEY = `itin-wizard-test-trip-v9-${normalizedEmail}`;
    const hasSeen = localStorage.getItem(TEST_TRIP_KEY);

    if (hasSeen === 'true' || creationInFlight.current === normalizedEmail) {
      return;
    }

    // Check if user owns any projects or already has a test trip (old or new naming)
    const ownedProjects = projects.filter(p => p.owner_email?.trim().toLowerCase() === normalizedEmail);
    const alreadyHasTestTrip = ownedProjects.some(p => p.metadata.name?.startsWith('TEST:') || p.metadata.name?.endsWith(' TEST'));
    
    console.log(`[TestTrip] Evaluating ${normalizedEmail}:`, {
      owned: ownedProjects.length,
      hasTest: alreadyHasTestTrip,
      projectsLoaded: projects.length
    });

    if (ownedProjects.length === 0 && !alreadyHasTestTrip) {
      console.log("[TestTrip] Triggering creation...");
      creationInFlight.current = normalizedEmail;
      
      // Mark as seen immediately to prevent concurrent triggers
      localStorage.setItem(TEST_TRIP_KEY, 'true');

      const testProject: TravelProject = {
        ...SEED_PROJECT,
        project_id: crypto.randomUUID(),
        owner_email: normalizedEmail,
        metadata: {
          ...SEED_PROJECT.metadata,
          name: `TEST: ${SEED_PROJECT.metadata.name}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          travelers: [
            { name: normalizedEmail, isMinor: false }
          ],
          collaborators: []
        },
        phase_3_packing: {
          ...SEED_PROJECT.phase_3_packing,
          items: SEED_PROJECT.phase_3_packing.items.map(item => ({
            ...item,
            assignedTo: item.assignedTo === 'Neil Stryjski' ? normalizedEmail : item.assignedTo
          }))
        }
      };
      
      addMutation.mutate(testProject, {
        onSuccess: () => {
          console.log("[TestTrip] Toasting success!");
          toast.success("Welcome! We've added a sample trip to get you started.");
          creationInFlight.current = null;
        },
        onError: (err) => {
          console.error("[TestTrip] Failed to create test trip:", err);
          localStorage.removeItem(TEST_TRIP_KEY);
          creationInFlight.current = null;
        }
      });
    } else {
      localStorage.setItem(TEST_TRIP_KEY, 'true');
    }
  }, [email, isLoading, isError, projects, addMutation]);

  const updateMutation = useMutation({
    mutationFn: async ({ projectId, updater }: { projectId: string; updater: (p: TravelProject) => TravelProject }) => {
      // Fetch current
      const { data: rows, error: fetchErr } = await supabase
        .from('projects')
        .select('data')
        .eq('project_id', projectId)
        .single();
      if (fetchErr) throw fetchErr;
      const current = rows.data as unknown as TravelProject;
      const updated = updater(current);
      updated.metadata.updatedAt = new Date().toISOString();
      
      const { error } = await supabase
        .from('projects')
        .update({ data: JSON.parse(JSON.stringify(updated)) })
        .eq('project_id', projectId);
      if (error) throw error;

      // Sync collaborators to table
      const newCollabs = updated.metadata.collaborators || [];
      const oldCollabs = current.metadata.collaborators || [];
      
      // Add new ones
      const toAdd = newCollabs.filter(c => !oldCollabs.includes(c));
      if (toAdd.length > 0) {
        await supabase.from('project_collaborators').upsert(
          toAdd.map(c => ({ project_id: projectId, user_email: c })),
          { onConflict: 'project_id,user_email' }
        );
      }
      
      // Remove old ones
      const toRemove = oldCollabs.filter(c => !newCollabs.includes(c));
      if (toRemove.length > 0) {
        await supabase.from('project_collaborators').delete().eq('project_id', projectId).in('user_email', toRemove);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(email!) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').delete().eq('project_id', projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(email!) }),
  });

  const addProject = useCallback((project: TravelProject, onSuccess?: () => void) => {
    addMutation.mutate(project, {
      onSuccess: () => {
        if (onSuccess) onSuccess();
      }
    });
  }, [addMutation]);

  const updateProject = useCallback((projectId: string, updater: (p: TravelProject) => TravelProject) => {
    updateMutation.mutate({ projectId, updater });
  }, [updateMutation]);

  const deleteProject = useCallback((projectId: string) => {
    deleteMutation.mutate(projectId);
  }, [deleteMutation]);

  const getProject = useCallback((projectId: string) => {
    return projects.find(p => p.project_id === projectId);
  }, [projects]);

  const finalizeProject = useCallback((projectId: string) => {
    if (!email) return;
    const project = getProject(projectId);
    if (!project) return;
    
    // Permission check: Only owner can finalize
    if (project.owner_email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      toast.error("Only the project owner can finalize this trip.");
      return;
    }

    updateMutation.mutate({
      projectId,
      updater: (p) => ({
        ...p,
        metadata: {
          ...p.metadata,
          is_finalized: true,
          is_locked: true,
          version: 1,
          finalized_at: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    });
  }, [email, getProject, updateMutation]);

  const archiveProject = useCallback((projectId: string) => {
    if (!email) return;
    const project = getProject(projectId);
    if (!project) return;
    
    // Permission check: Only owner can archive
    if (project.owner_email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      toast.error("Only the project owner can archive this trip.");
      return;
    }

    updateMutation.mutate({
      projectId,
      updater: (p) => ({
        ...p,
        metadata: {
          ...p.metadata,
          status: 'archived',
          updatedAt: new Date().toISOString()
        }
      })
    });
  }, [email, getProject, updateMutation]);

  const restoreProject = useCallback((projectId: string) => {
    updateMutation.mutate({
      projectId,
      updater: (p) => ({
        ...p,
        metadata: {
          ...p.metadata,
          status: 'active',
          updatedAt: new Date().toISOString()
        }
      })
    });
  }, [updateMutation]);

  return { 
    projects, 
    isLoading, 
    isError, 
    addProject, 
    updateProject, 
    deleteProject, 
    getProject, 
    finalizeProject, 
    archiveProject, 
    restoreProject 
  };
}
