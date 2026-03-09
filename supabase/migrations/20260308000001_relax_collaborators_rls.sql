
-- Relax RLS for project_collaborators to match projects table (Email-as-Identity phase)
DROP POLICY IF EXISTS "Users can view collaborators for projects they own or are on" ON public.project_collaborators;

CREATE POLICY "Allow all select" ON public.project_collaborators FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.project_collaborators FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.project_collaborators FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.project_collaborators FOR DELETE USING (true);
