import { useState, useEffect, useCallback } from 'react';
import { TravelProject } from '@/types/project';

const STORAGE_KEY = 'travel-architect-projects';

function loadProjects(): TravelProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: TravelProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState<TravelProject[]>(loadProjects);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const addProject = useCallback((project: TravelProject) => {
    setProjects(prev => [...prev, project]);
  }, []);

  const updateProject = useCallback((projectId: string, updater: (p: TravelProject) => TravelProject) => {
    setProjects(prev => prev.map(p =>
      p.project_id === projectId
        ? { ...updater(p), metadata: { ...updater(p).metadata, updatedAt: new Date().toISOString() } }
        : p
    ));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.project_id !== projectId));
  }, []);

  const getProject = useCallback((projectId: string) => {
    return projects.find(p => p.project_id === projectId);
  }, [projects]);

  return { projects, addProject, updateProject, deleteProject, getProject };
}
