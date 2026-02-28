import { useState, useEffect, useCallback } from 'react';
import { TravelProject } from '@/types/project';
import { SEED_PROJECT } from '@/data/seed';

const STORAGE_KEY = 'travel-architect-projects';
const SEEDED_KEY = 'travel-architect-seeded';

function loadProjects(): TravelProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Auto-seed on first load
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(SEEDED_KEY, 'true');
      return [SEED_PROJECT];
    }
    return [];
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
