import React, { createContext, useContext } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useUserEmail } from '@/hooks/useUserEmail';
import { TravelProject } from '@/types/project';

interface ProjectsContextType {
  projects: TravelProject[];
  isLoading: boolean;
  isError: boolean;
  addProject: (p: TravelProject, onSuccess?: () => void) => void;
  updateProject: (id: string, updater: (p: TravelProject) => TravelProject) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => TravelProject | undefined;
  finalizeProject: (id: string) => void;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;
  email: string | null;
  setEmail: (email: string) => void;
  clearEmail: () => void;
  isChangingUser: boolean;
  setIsChangingUser: (val: boolean) => void;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { email, setEmail, clearEmail } = useUserEmail();
  const projectsData = useProjects(email);
  const [isChangingUser, setIsChangingUser] = React.useState(false);

  const handleSetEmail = (newEmail: string) => {
    setEmail(newEmail);
    setIsChangingUser(false);
  };

  return (
    <ProjectsContext.Provider value={{ 
      ...projectsData, 
      email, 
      setEmail: handleSetEmail, 
      clearEmail,
      isChangingUser,
      setIsChangingUser
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjectsContext must be inside ProjectsProvider');
  return ctx;
}
