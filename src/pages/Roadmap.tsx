
import { useState, useEffect } from 'react';
import { Lightbulb, Bug, Rocket, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserEmail } from '@/hooks/useUserEmail';
import { parseRoadmapMarkdown, RoadmapItem } from '@/lib/roadmap-parser';

// Import raw markdown
import roadmapRaw from '../../PROJECT_ROADMAP.md?raw';

export default function Roadmap() {
  const [features, setFeatures] = useState<RoadmapItem[]>([]);
  const [bugs, setBugs] = useState<RoadmapItem[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { email } = useUserEmail();
  const { toast } = useToast();

  useEffect(() => {
    const { features, bugs } = parseRoadmapMarkdown(roadmapRaw);
    setFeatures(features);
    setBugs(bugs);
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setIsSubmitting(true);
    try {
      // Fetch existing VoC project
      const { data: existing, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('project_id', 'voc_requests')
        .maybeSingle();

      if (fetchError) throw fetchError;

      const newEntry = {
        text: newRequest.trim(),
        email: email || 'anonymous',
        timestamp: new Date().toISOString(),
        status: 'new'
      };

      if (existing) {
        // Append to existing
        const currentData = (existing.data as any) || { requests: [] };
        const updatedRequests = [...(currentData.requests || []), newEntry];
        
        const { error: updateError } = await supabase
          .from('projects')
          .update({ data: { ...currentData, requests: updatedRequests } })
          .eq('project_id', 'voc_requests');

        if (updateError) throw updateError;
      } else {
        // Create new row
        const { error: insertError } = await supabase
          .from('projects')
          .insert([
            {
              project_id: 'voc_requests',
              owner_email: 'system',
              data: { requests: [newEntry] }
            }
          ]);

        if (insertError) throw insertError;
      }

      toast({
        title: "Request submitted!",
        description: "Your feedback helps us prioritize the roadmap.",
      });
      setNewRequest('');
    } catch (err) {
      console.error('Error submitting VoC:', err);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Could not save your request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bug': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Active Bug</Badge>;
      case 'in-progress': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">In Progress</Badge>;
      case 'done': return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Done</Badge>;
      default: return <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Planned</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 fade-in">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-bold tracking-tight">Project Roadmap</h1>
        <p className="text-xl text-muted-foreground">The future of Itinerary Wizard, synced from our core development board.</p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Feature Backlog</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((item, i) => (
            <Card key={item.id} className="slide-up relative overflow-hidden group border-muted/50 hover:border-primary/50 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="p-5 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {item.owner && (
                  <div className="mt-4 pt-4 border-t border-muted/30 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                      {item.owner.includes('Gemini') ? '♊' : '🤖'}
                    </div>
                    <span className="text-xs text-muted-foreground">Assigned to {item.owner}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {bugs.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-destructive" />
            <h2 className="text-2xl font-bold">Known Issues</h2>
          </div>
          <div className="grid gap-4">
            {bugs.map((item, i) => (
              <Card key={item.id} className="slide-up border-destructive/20 bg-destructive/5" style={{ animationDelay: `${(features.length + i) * 50}ms` }}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono opacity-60">{item.id}</span>
                      <h3 className="font-bold">{item.title}</h3>
                    </div>
                    <p className="text-sm opacity-80">{item.description}</p>
                  </div>
                  {getStatusBadge('bug')}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="pt-10 border-t">
        <Card className="bg-secondary/20 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Voice of the Customer
            </CardTitle>
            <CardDescription>
              Missing a feature? Found a bug? Let us know what you want to see next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <Textarea 
                placeholder="Describe the feature or improvement you'd like to see..." 
                value={newRequest}
                onChange={(e) => setNewRequest(e.target.value)}
                className="min-h-[120px] bg-background/50"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !newRequest.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <footer className="text-center py-10 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Itinerary Wizard Project Source of Truth</span>
        </div>
      </footer>
    </div>
  );
}
