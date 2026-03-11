
-- Table for storing encrypted user cloud tokens (GDrive, etc.)
CREATE TABLE public.user_cloud_auth (
  user_email text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'google',
  tokens jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cloud_auth ENABLE ROW LEVEL SECURITY;

-- Allow all access for Email-as-Identity phase (matching projects table)
CREATE POLICY "Allow all select" ON public.user_cloud_auth FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.user_cloud_auth FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.user_cloud_auth FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.user_cloud_auth FOR DELETE USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_user_cloud_auth_updated_at
BEFORE UPDATE ON public.user_cloud_auth
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
