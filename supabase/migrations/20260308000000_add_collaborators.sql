
-- Table for project collaborators
CREATE TABLE public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_email)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators table policies
CREATE POLICY "Users can view collaborators for projects they own or are on" 
ON public.project_collaborators FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE project_id = project_collaborators.project_id 
    AND (owner_email = auth.jwt() ->> 'email' OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc 
      WHERE pc.project_id = projects.project_id AND pc.user_email = auth.jwt() ->> 'email'
    ))
  )
);

-- Projects table policies update (Refined for collaborative access)
-- NOTE: We already had "Allow all" policies from the first migration. 
-- In a real production app with Supabase Auth, we'd restrict these to owner_email or collaborator check.
-- For this "Email-as-Identity" phase, we will update the client-side queries to filter.

-- Add index for performance
CREATE INDEX idx_project_collaborators_email ON public.project_collaborators(user_email);
CREATE INDEX idx_project_collaborators_project_id ON public.project_collaborators(project_id);
