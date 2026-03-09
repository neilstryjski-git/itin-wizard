import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TravelProject } from '@/types/project';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

function projectsQueryKey(email: string) {
  return ['projects', email];
}

const LEGACY_STORAGE_KEY = 'travel-projects';

interface ProjectCollaboratorLink {
  project_id: string;
}

export function useProjects(email: string | null) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectsQueryKey(email ?? ''),
    queryFn: async () => {
      if (!email) return [];
      const normalizedEmail = email.trim().toLowerCase();
      
      // 1. Fetch projects where user is owner
      const { data: owned, error: ownedErr } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_email', normalizedEmail);
      
      if (ownedErr) throw ownedErr;

      // 2. Fetch projects where user is a collaborator (from JSON data)
      // Using .contains on the jsonb column for maximum reliability
      const { data: sharedJson, error: sharedJsonErr } = await supabase
        .from('projects')
        .select('*')
        .contains('data', { metadata: { collaborators: [normalizedEmail] } });

      if (sharedJsonErr) throw sharedJsonErr;

      // 3. Fetch projects where user is a collaborator (from collaborators table)
      const { data: sharedTableLinks, error: tableErr } = await supabase
        .from('project_collaborators')
        .select('project_id')
        .eq('user_email', normalizedEmail);
      
      let sharedTable: Tables<'projects'>[] = [];
      if (!tableErr && sharedTableLinks && (sharedTableLinks as unknown as ProjectCollaboratorLink[]).length > 0) {
        const links = sharedTableLinks as unknown as ProjectCollaboratorLink[];
        const ids = links.map(l => l.project_id);
        const { data: tableProjects, error: tableProjErr } = await supabase
          .from('projects')
          .select('*')
          .in('project_id', ids);
        if (!tableProjErr && tableProjects) {
          sharedTable = tableProjects as Tables<'projects'>[];
        }
      }

      // 4. Combine and deduplicate by project_id
      const allRows = [...(owned || []), ...(sharedJson || []), ...sharedTable];
      const uniqueRows = Array.from(new Map(allRows.map(r => [r.project_id, r])).values());
      
      return uniqueRows.map(row => ({
        ...(row.data as unknown as TravelProject),
        owner_email: row.owner_email
      }));
    },
    enabled: !!email,
  });

  const addMutation = useMutation({
    mutationFn: async (project: TravelProject) => {
      const { error } = await supabase.from('projects').insert([{
        project_id: project.project_id,
        owner_email: email!,
        data: JSON.parse(JSON.stringify(project)),
      }]);
      if (error) throw error;

      // Sync collaborators to table if any
      if (project.metadata.collaborators && project.metadata.collaborators.length > 0) {
        const collaborators = project.metadata.collaborators.map(c => ({
          project_id: project.project_id,
          user_email: c.trim().toLowerCase()
        }));
        await supabase.from('project_collaborators').upsert(collaborators, { onConflict: 'project_id,user_email' });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(email!) }),
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
          // Check if it already exists in the fetched projects
          const exists = projects.some(p => p.project_id === lp.project_id);
          if (!exists) {
            await supabase.from('projects').insert([{
              project_id: lp.project_id,
              owner_email: email,
              data: JSON.parse(JSON.stringify(lp)),
            }]);
            
            // Sync collaborators from migrated project
            if (lp.metadata.collaborators && lp.metadata.collaborators.length > 0) {
              const collaborators = lp.metadata.collaborators.map(c => ({
                project_id: lp.project_id,
                user_email: c.trim().toLowerCase()
              }));
              await supabase.from('project_collaborators').upsert(collaborators, { onConflict: 'project_id,user_email' });
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

  const addProject = useCallback((project: TravelProject) => {
    addMutation.mutate(project);
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

  return { projects, isLoading, addProject, updateProject, deleteProject, getProject };
}
