import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ExportButton } from '@/components/ExportButton';
import { EmailPrompt } from '@/components/EmailPrompt';
import { useProjectsContext } from '@/contexts/ProjectsContext';

export default function Layout() {
  const location = useLocation();
  const projectMatch = location.pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;
  const { email, setEmail } = useProjectsContext();

  return (
    <>
      <EmailPrompt open={!email} onSubmit={setEmail} />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
              <SidebarTrigger className="mr-4" />
              {projectId && <ExportButton projectId={projectId} />}
            </header>
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
