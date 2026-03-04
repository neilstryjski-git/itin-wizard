import { useLocation } from 'react-router-dom';
import {
  Palmtree, LayoutDashboard, MessageCircle, CalendarDays, Backpack, Map, ChevronRight, LogOut, Mail,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { getProject, email, clearEmail } = useProjectsContext();
  const projectMatch = location.pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : undefined;
  const project = projectId ? getProject(projectId) : undefined;

  const mainNav = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
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
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground">
              TravelArchitect
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
              {!collapsed ? (
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
                        {!collapsed && <span>{item.title}</span>}
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
        <SidebarFooter className="p-3 border-t">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && (
              <span className="text-xs text-muted-foreground truncate flex-1">{email}</span>
            )}
            {!collapsed && (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearEmail} title="Switch identity">
                <LogOut className="h-3 w-3" />
              </Button>
            )}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
