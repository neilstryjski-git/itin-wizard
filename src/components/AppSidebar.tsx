import { useLocation } from 'react-router-dom';
import {
  Palmtree, MessageCircle, CalendarDays, Backpack, Map, ChevronRight, LogOut,
  FileEdit, ShieldCheck, Archive,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const showLabels = !collapsed || isMobile;
  const location = useLocation();
  const { getProject, email, setIsChangingUser, projects } = useProjectsContext();
  const projectMatch = location.pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : undefined;
  const project = projectId ? getProject(projectId) : undefined;

  const draftCount = projects.filter(p => p.metadata.is_finalized !== true && p.metadata.status !== 'archived').length;
  const finalizedCount = projects.filter(p => p.metadata.is_finalized === true && p.metadata.status !== 'archived').length;
  const archiveCount = projects.filter(p => p.metadata.status === 'archived').length;

  const libraryNav = [
    { title: 'Drafts', url: '/', icon: FileEdit, count: draftCount, end: true },
    { title: 'Finalized', url: '/finalized', icon: ShieldCheck, count: finalizedCount, end: false },
    { title: 'Archive', url: '/archive', icon: Archive, count: archiveCount, end: false },
  ];

  const mainNav = [
    { title: 'Roadmap', url: '/roadmap', icon: Map },
  ];

  const projectNav = project ? [
    { title: 'Interview', url: `/project/${projectId}/interview`, icon: MessageCircle },
    { title: 'Itinerary', url: `/project/${projectId}/itinerary`, icon: CalendarDays },
    { title: 'Packing', url: `/project/${projectId}/packing`, icon: Backpack },
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
        <SidebarFooter className="p-2 border-t mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                onClick={() => setIsChangingUser(true)}
                title={`Change User (${email})`}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LogOut className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Change User</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
