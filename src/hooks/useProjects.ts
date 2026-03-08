import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TravelProject } from '@/types/project';
import { toast } from 'sonner';

function projectsQueryKey(email: string) {
  return ['projects', email];
}

const LEGACY_STORAGE_KEY = 'travel-projects';

export function useProjects(email: string | null) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectsQueryKey(email ?? ''),
    queryFn: async () => {
      if (!email) return [];
      const normalizedEmail = email.trim().toLowerCase();
      
      // Fetch projects where user is owner OR user is in the collaborators list
      // Using PostgREST 'or' with JSONB containment filter
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(`owner_email.eq.${normalizedEmail},data->metadata->collaborators.cs.["${normalizedEmail}"]`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return (data || []).map(row => ({
        ...(row.data as unknown as TravelProject),
        owner_email: row.owner_email // Inject owner info for UI checks
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
