import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palmtree } from 'lucide-react';

interface EmailPromptProps {
  open: boolean;
  onSubmit: (email: string) => void;
  onClose?: () => void;
  closable?: boolean;
}

export function EmailPrompt({ open, onSubmit, onClose, closable = false }: EmailPromptProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && closable && onClose) {
        onClose();
      }
    }}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={e => {
          if (!closable) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (!closable) e.preventDefault();
        }}
        showCloseButton={closable}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Palmtree className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">Trip Wizard</DialogTitle>
          </div>
          <DialogDescription>
            Enter your email to get started. Your trips will be saved to this identity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="you@example.com"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
