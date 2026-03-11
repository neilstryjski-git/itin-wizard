import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ChatMessage, RequirementItem } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WELCOME_MSG = `Welcome! Tell me about your trip — where you're going, who's traveling, your dates, anything you know so far. I'll figure out the rest!`;

interface ExtractedData {
  tripName?: string;
  destination?: string;
  travelers?: { name: string; isMinor: boolean; citizenship?: string; residency?: string }[];
  transitViaUSA?: boolean;
  transitCountry?: string;
  startDate?: string;
  endDate?: string;
}

export default function Phase1Interview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject, isLoading } = useProjectsContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const project = getProject(projectId!);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [accumulated, setAccumulated] = useState<ExtractedData>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!project) return;
    if (project.phase_1_requirements.completed) {
      setMessages(project.phase_1_requirements.chatHistory);
      setIsCompleted(true);
      // Rebuild accumulated from metadata
      setAccumulated({
        tripName: project.metadata.name,
        destination: project.metadata.destination,
        travelers: project.metadata.travelers,
        transitViaUSA: project.metadata.transitViaUSA,
        transitCountry: project.metadata.transitCountry,
        startDate: project.metadata.startDate,
        endDate: project.metadata.endDate,
      });
      return;
    }
    if (project.phase_1_requirements.chatHistory.length > 0) {
      setMessages(project.phase_1_requirements.chatHistory);
    } else {
      const first: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: WELCOME_MSG,
      };
      setMessages([first]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!project && !isLoading) {
      navigate('/');
    }
  }, [project, isLoading, navigate]);

  if (!project) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsAnalyzing(true);

    try {
      // Build conversation for AI — only user/assistant content messages
      const aiMessages = newMessages
        .map(m => ({ role: m.role, content: m.text }));

      const { data, error } = await supabase.functions.invoke('analyze-interview', {
        body: { 
          messages: aiMessages,
          currentChecklist: project.phase_1_requirements.checklist 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { extracted, missingFields, followUpMessage, allComplete, checklistUpdates } = data;

      // Merge extracted data with accumulated
      const merged = { ...accumulated };
      if (extracted.tripName) merged.tripName = extracted.tripName;
      if (extracted.destination) merged.destination = extracted.destination;
      if (extracted.travelers?.length) {
        // Merge traveler details - update existing travelers with new info
        if (merged.travelers?.length) {
          merged.travelers = extracted.travelers.map(newT => {
            const existing = merged.travelers?.find(e => e.name.toLowerCase() === newT.name.toLowerCase());
            return {
              name: newT.name,
              isMinor: newT.isMinor,
              citizenship: newT.citizenship || existing?.citizenship,
              residency: newT.residency || existing?.residency,
            };
          });
        } else {
          merged.travelers = extracted.travelers;
        }
      }
      if (extracted.transitViaUSA !== undefined && extracted.transitViaUSA !== null) merged.transitViaUSA = extracted.transitViaUSA;
      if (extracted.transitCountry) merged.transitCountry = extracted.transitCountry;
      if (extracted.startDate) merged.startDate = extracted.startDate;
      if (extracted.endDate) merged.endDate = extracted.endDate;
      setAccumulated(merged);

      // Update project metadata with what we have so far
      updateProject(projectId!, p => {
        const md = { ...p.metadata };
        if (merged.tripName) md.name = merged.tripName;
        if (merged.destination) md.destination = merged.destination;
        if (merged.travelers?.length) md.travelers = merged.travelers;
        if (merged.transitViaUSA !== undefined) md.transitViaUSA = merged.transitViaUSA;
        if (merged.transitCountry) md.transitCountry = merged.transitCountry;
        if (merged.startDate) md.startDate = merged.startDate;
        if (merged.endDate) md.endDate = merged.endDate;
        return { ...p, metadata: md };
      });

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: followUpMessage,
      };
      const updatedMessages = [...newMessages, botMsg];
      setMessages(updatedMessages);

      if (allComplete && !isCompleted) {
        const checklist = generateChecklist(merged);
        setIsCompleted(true);
        updateProject(projectId!, p => ({
          ...p,
          phase_1_requirements: {
            ...p.phase_1_requirements,
            completed: true,
            chatHistory: updatedMessages,
            checklist,
          },
        }));
      } else if (checklistUpdates) {
        updateProject(projectId!, p => {
          let newList = [...p.phase_1_requirements.checklist];
          
          if (checklistUpdates.remove) {
            newList = newList.filter(item => !checklistUpdates.remove.includes(item.id));
          }
          
          if (checklistUpdates.update) {
            newList = newList.map(item => {
              const update = checklistUpdates.update.find((u: any) => u.id === item.id);
              return update ? { ...item, ...update } : item;
            });
          }
          
          if (checklistUpdates.add) {
            const newItems = checklistUpdates.add.map((item: any) => ({
              id: crypto.randomUUID(),
              checked: false,
              autoAdded: true,
              ...item
            }));
            newList = [...newList, ...newItems];
          }
          
          return {
            ...p,
            phase_1_requirements: {
              ...p.phase_1_requirements,
              chatHistory: updatedMessages,
              checklist: newList
            }
          };
        });
      } else {
        // Save chat history
        updateProject(projectId!, p => ({
          ...p,
          phase_1_requirements: {
            ...p.phase_1_requirements,
            chatHistory: updatedMessages,
          },
        }));
      }
    } catch (e: any) {
      console.error('Interview analysis error:', e);
      toast({
        title: 'Analysis failed',
        description: e.message || 'Please try again.',
        variant: 'destructive',
      });
      // Add error message to chat
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: "Sorry, I had trouble analyzing that. Could you try again?",
      };
      setMessages([...newMessages, errMsg]);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="p-4 border-b bg-card">
        <h2 className="font-heading text-xl font-semibold">Travel Interview</h2>
        <p className="text-sm text-muted-foreground">
          {isCompleted ? 'Interview complete — you can refine the checklist below' : 'Tell me about your trip — I\'ll ask only what I need'}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <Card className={`max-w-md p-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card'
            }`}>
              {msg.text}
            </Card>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isAnalyzing && (
          <div className="flex gap-3 fade-in">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <Card className="max-w-md p-3 text-sm bg-card flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your details...
            </Card>
          </div>
        )}

        {isCompleted && project.phase_1_requirements.checklist.length > 0 && (
          <div className="fade-in mt-6">
            <h3 className="font-heading font-semibold text-lg mb-3">Requirements Checklist</h3>
            <Card className="p-4 space-y-2">
              {project.phase_1_requirements.checklist.map(item => (
                <div key={item.id} className="flex items-start gap-2 group py-1">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {
                      updateProject(projectId!, p => ({
                        ...p,
                        phase_1_requirements: {
                          ...p.phase_1_requirements,
                          checklist: p.phase_1_requirements.checklist.map(c =>
                            c.id === item.id ? { ...c, checked: !c.checked } : c
                          ),
                        },
                      }));
                    }}
                    className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                      {item.autoAdded && (
                        <span className="ml-1 text-xs text-warning">⚡ AI Managed</span>
                      )}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                        🔗 {item.url_label || item.url}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </Card>
            <Button
              className="mt-4 gap-2"
              onClick={() => navigate(`/project/${projectId}/itinerary`)}
            >
              <CheckCircle2 className="h-4 w-4" /> Continue to Itinerary
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-card">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCompleted ? "Add, change or delete checklist items..." : "Tell me about your trip... (Shift+Enter for new line)"}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isAnalyzing}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isAnalyzing || !input.trim()}>
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function generateChecklist(data: ExtractedData): RequirementItem[] {
  const items: RequirementItem[] = [];
  const id = () => crypto.randomUUID();

  const dest = data.destination?.toLowerCase() || '';
  const travelers = data.travelers || [];
  const hasMinors = travelers.some(t => t.isMinor);

  // Universal requirements
  items.push({ id: id(), title: 'Valid passports for all travelers (check expiry — most countries require 6+ months validity)', checked: false });
  items.push({ id: id(), title: 'Travel insurance purchased', checked: false });
  items.push({ id: id(), title: 'Copies of all booking confirmations', checked: false });
  items.push({ id: id(), title: 'Emergency contact information sheet', checked: false });
  items.push({ id: id(), title: 'Digital and printed copies of all travel documents', checked: false });

  // Per-traveler citizenship-based requirements
  const citizenships = [...new Set(travelers.map(t => t.citizenship?.toLowerCase()).filter(Boolean))];
  const residencies = [...new Set(travelers.map(t => t.residency?.toLowerCase()).filter(Boolean))];

  // ESTA / US visa requirements based on citizenship
  if (data.transitViaUSA || dest.includes('united states') || dest.includes('usa') || dest.includes('us')) {
    const needsESTA = (c: string) =>
      ['canadian', 'canada'].every(x => !c.includes(x)); // Canadians don't need ESTA

    const estaNeeded = travelers.filter(t => t.citizenship && needsESTA(t.citizenship.toLowerCase()));
    if (estaNeeded.length > 0) {
      items.push({
        id: id(),
        title: `ESTA authorization for USA ${data.transitViaUSA ? 'transit' : 'entry'} — required for: ${estaNeeded.map(t => t.name).join(', ')}`,
        checked: false,
        autoAdded: true,
        url: 'https://esta.cbp.dhs.gov',
        url_label: 'ESTA Application Portal',
      });
    }
  }

  // Belize specific
  if (dest.includes('belize')) {
    items.push({
      id: id(),
      title: 'Complete Belize Digital E-Embarkation Form',
      description: 'Required for all travelers entering Belize',
      checked: false,
      autoAdded: true,
      url: 'https://ideclare.gov.bz',
      url_label: 'Official Belize Immigration Portal',
    });
  }

  // EU/Schengen specific
  const schengenCountries = ['france', 'germany', 'italy', 'spain', 'portugal', 'netherlands', 'belgium', 'austria', 'greece', 'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'iceland', 'czech', 'poland', 'hungary', 'croatia'];
  if (schengenCountries.some(c => dest.includes(c))) {
    const nonEU = travelers.filter(t => {
      const cit = t.citizenship?.toLowerCase() || '';
      return !schengenCountries.some(c => cit.includes(c)) && !cit.includes('eu');
    });
    if (nonEU.length > 0) {
      items.push({
        id: id(),
        title: `Check Schengen visa requirements for: ${nonEU.map(t => `${t.name} (${t.citizenship || 'unknown citizenship'})`).join(', ')}`,
        description: 'Non-EU citizens may need a Schengen visa depending on nationality',
        checked: false,
        autoAdded: true,
      });
    }
    items.push({
      id: id(),
      title: 'ETIAS travel authorization (if applicable)',
      description: 'Required for visa-exempt non-EU nationals starting 2025',
      checked: false,
      autoAdded: true,
      url: 'https://travel-europe.europa.eu/etias_en',
      url_label: 'ETIAS Official Portal',
    });
  }

  // UK specific
  if (dest.includes('uk') || dest.includes('united kingdom') || dest.includes('england') || dest.includes('scotland') || dest.includes('london')) {
    const nonBritish = travelers.filter(t => {
      const cit = t.citizenship?.toLowerCase() || '';
      return !cit.includes('british') && !cit.includes('uk');
    });
    if (nonBritish.length > 0) {
      items.push({
        id: id(),
        title: `Check UK visa/ETA requirements for: ${nonBritish.map(t => `${t.name} (${t.citizenship || 'unknown'})`).join(', ')}`,
        checked: false,
        autoAdded: true,
        url: 'https://www.gov.uk/check-uk-visa',
        url_label: 'UK Visa Check',
      });
    }
  }

  // Mexico specific
  if (dest.includes('mexico')) {
    items.push({
      id: id(),
      title: 'Complete Mexico immigration form (FMM)',
      description: 'Required for all visitors to Mexico',
      checked: false,
      autoAdded: true,
    });
  }

  // Minor-specific requirements
  if (hasMinors) {
    const minorNames = travelers.filter(t => t.isMinor).map(t => t.name).join(', ');

    if (data.transitViaUSA) {
      items.push({
        id: id(),
        title: `Notarized consent letters for minor travelers transiting USA: ${minorNames}`,
        description: 'Required when minors travel internationally, especially through the USA. Both parents must sign unless traveling together.',
        checked: false,
        autoAdded: true,
      });
    }

    items.push({
      id: id(),
      title: `Birth certificates for minor travelers: ${minorNames}`,
      description: 'May be required at border crossings to prove parental relationship',
      checked: false,
      autoAdded: true,
    });

    items.push({
      id: id(),
      title: `Parental consent / custody documents for: ${minorNames}`,
      description: 'If only one parent is traveling, a notarized letter from the other parent is recommended',
      checked: false,
      autoAdded: true,
    });
  }

  // Residency-based notes
  const canadianResidents = travelers.filter(t => t.residency?.toLowerCase().includes('canad'));
  if (canadianResidents.length > 0) {
    const nonCitizens = canadianResidents.filter(t => !t.citizenship?.toLowerCase().includes('canad'));
    if (nonCitizens.length > 0) {
      items.push({
        id: id(),
        title: `Verify PR card validity for Canadian residents who are not citizens: ${nonCitizens.map(t => t.name).join(', ')}`,
        description: 'Permanent residents need a valid PR card to re-enter Canada',
        checked: false,
        autoAdded: true,
      });
    }
  }

  // Health & vaccination
  const tropicalDests = ['belize', 'mexico', 'costa rica', 'colombia', 'brazil', 'thailand', 'vietnam', 'indonesia', 'india', 'kenya', 'tanzania', 'south africa'];
  if (tropicalDests.some(c => dest.includes(c))) {
    items.push({
      id: id(),
      title: 'Check vaccination requirements and travel health advisories',
      description: 'Some destinations require proof of yellow fever, COVID, or other vaccinations',
      checked: false,
      autoAdded: true,
    });
  }

  return items;
}
