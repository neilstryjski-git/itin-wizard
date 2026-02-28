import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ExportButton({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  return (
    <Button variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}/export`)} className="gap-1">
      <Download className="h-3 w-3" /> Review PDF
    </Button>
  );
}
