import { useLocation } from 'react-router-dom';
import {
  Palmtree, MessageCircle, CalendarDays, Backpack, Map, ChevronRight, LogOut,
  FileEdit, ShieldCheck, Archive,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { Button } from '@/components/ui/button';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const showLabels = !collapsed || isMobile;
  const location = useLocation();
  const { getProject, email, setIsChangingUser, projects } = useProjectsContext();
  const projectMatch = location.pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : undefined;
  const project = projectId ? getProject(projectId) : undefined;

  const draftCount = projects.filter(p => p.metadata.is_finalized !== true && p.metadata.status !== 'active' ? false : p.metadata.is_finalized !== true).length;
  // Note: the above count logic was a bit messy, let's simplify based on Dashboard logic
  const drafts = projects.filter(p => p.metadata.is_finalized !== true && p.metadata.status !== 'archived');
  const finalized = projects.filter(p => p.metadata.is_finalized === true && p.metadata.status !== 'archived');
  const archived = projects.filter(p => p.metadata.status === 'archived');

  const libraryNav = [
    { title: 'Drafts', url: '/', icon: FileEdit, count: drafts.length, end: true },
    { title: 'Finalized', url: '/finalized', icon: ShieldCheck, count: finalized.length, end: false },
    { title: 'Archive', url: '/archive', icon: Archive, count: archived.length, end: false },
  ];

  const mainNav = [
    { title: 'Roadmap', url: '/roadmap', icon: Map },
  ];

  const projectNav = project ? [
    { title: 'Interview', url: `/project/${projectId}/interview`, icon: MessageCircle },
    { title: 'Itinerary', url: `/project/${projectId}/itinerary`, icon: CalendarDays },
    ...(FEATURE_FLAGS.PACKING_LIST_ENABLED ? [
      { title: 'Packing', url: `/project/${projectId}/packing`, icon: Backpack }
    ] : []),
  ] : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Palmtree className="h-6 w-6 text-sidebar-primary" />
          {showLabels && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground">
              Trip Wizard
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Travel Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryNav.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.end} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                      {showLabels && (
                        <span className="flex-1">{item.title}</span>
                      )}
                      {showLabels && item.count > 0 && (
                        <span className="ml-auto text-xs font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                          {item.count}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="mr-2 h-4 w-4" />
                      {showLabels && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {project && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {showLabels ? (
                <span className="flex items-center gap-1 truncate">
                  <ChevronRight className="h-3 w-3" />
                  {project.metadata.name || 'New Trip'}
                </span>
              ) : null}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNav.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="mr-2 h-4 w-4" />
                        {showLabels && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {email && (
        <SidebarFooter className="p-4 border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsChangingUser(true)}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start text-left text-xs">
                  <span className="font-medium">User Profile</span>
                  <span className="truncate text-[10px] opacity-70 max-w-[120px]">{email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function UserCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
    </svg>
  );
}
