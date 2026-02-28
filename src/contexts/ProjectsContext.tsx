import React, { createContext, useContext } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { TravelProject } from '@/types/project';

interface ProjectsContextType {
  projects: TravelProject[];
  addProject: (p: TravelProject) => void;
  updateProject: (id: string, updater: (p: TravelProject) => TravelProject) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => TravelProject | undefined;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const value = useProjects();
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjectsContext must be inside ProjectsProvider');
  return ctx;
}
