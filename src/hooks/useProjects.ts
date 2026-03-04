import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TravelProject } from '@/types/project';

function projectsQueryKey(email: string) {
  return ['projects', email];
}

export function useProjects(email: string | null) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectsQueryKey(email ?? ''),
    queryFn: async () => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_email', email)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => row.data as unknown as TravelProject);
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
