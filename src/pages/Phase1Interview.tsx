import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { ChatMessage, RequirementItem } from '@/types/project';

const INTERVIEW_STEPS = [
  { key: 'name', question: "What would you like to name this trip?", placeholder: "e.g., Belize Family Adventure 2026" },
  { key: 'destination', question: "What's your destination?", placeholder: "e.g., Belize, Mexico, Japan" },
  { key: 'travelers', question: "Who's traveling? List names, marking minors with (minor). Example: John, Sarah (minor)", placeholder: "e.g., Alice, Bob (minor), Charlie" },
  { key: 'transit', question: "Will you be transiting through the USA? (yes/no)", placeholder: "yes or no" },
  { key: 'dates', question: "What are your approximate travel dates? (start - end)", placeholder: "e.g., March 15 - March 22, 2026" },
];

export default function Phase1Interview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject } = useProjectsContext();
  const navigate = useNavigate();
  const project = getProject(projectId!);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!project) return;
    if (project.phase_1_requirements.completed) {
      setMessages(project.phase_1_requirements.chatHistory);
      setStep(INTERVIEW_STEPS.length);
      return;
    }
    if (project.phase_1_requirements.chatHistory.length > 0) {
      setMessages(project.phase_1_requirements.chatHistory);
      setStep(Math.floor(project.phase_1_requirements.chatHistory.length / 2));
    } else {
      const first: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Welcome! Let's plan your trip. ${INTERVIEW_STEPS[0].question}`,
      };
      setMessages([first]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (!project) {
    navigate('/');
    return null;
  }

  const handleSend = () => {
    if (!input.trim() || step >= INTERVIEW_STEPS.length) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input.trim() };
    const newMessages = [...messages, userMsg];
    const currentStep = INTERVIEW_STEPS[step];

    // Process answer
    updateProject(projectId!, p => {
      const updated = { ...p };
      const md = { ...updated.metadata };

      switch (currentStep.key) {
        case 'name':
          md.name = input.trim();
          break;
        case 'destination':
          md.destination = input.trim();
          break;
        case 'travelers':
          md.travelers = input.split(',').map(t => {
            const trimmed = t.trim();
            const isMinor = /\(minor\)/i.test(trimmed);
            return { name: trimmed.replace(/\s*\(minor\)\s*/i, ''), isMinor };
          });
          break;
        case 'transit':
          md.transitViaUSA = /^y/i.test(input.trim());
          break;
        case 'dates': {
          const parts = input.split('-').map(s => s.trim());
          if (parts.length >= 2) {
            md.startDate = parts[0];
            md.endDate = parts[1];
          }
          break;
        }
      }

      updated.metadata = md;
      updated.phase_1_requirements.chatHistory = newMessages;
      return updated;
    });

    const nextStep = step + 1;

    if (nextStep < INTERVIEW_STEPS.length) {
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Got it! ${INTERVIEW_STEPS[nextStep].question}`,
      };
      newMessages.push(botMsg);
    } else {
      // Generate checklist
      const checklist = generateChecklist(project, input, step);
      const summaryMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Excellent! I've compiled your requirements checklist. You can view it below and proceed to building your itinerary.`,
      };
      newMessages.push(summaryMsg);

      updateProject(projectId!, p => ({
        ...p,
        phase_1_requirements: {
          ...p.phase_1_requirements,
          completed: true,
          chatHistory: newMessages,
          checklist,
        },
      }));
    }

    setMessages(newMessages);
    setStep(nextStep);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isCompleted = step >= INTERVIEW_STEPS.length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="p-4 border-b bg-card">
        <h2 className="font-heading text-xl font-semibold">Travel Interview</h2>
        <p className="text-sm text-muted-foreground">
          {isCompleted ? 'Interview complete' : `Step ${step + 1} of ${INTERVIEW_STEPS.length}`}
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
            <Card className={`max-w-md p-3 text-sm ${
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
                        <span className="ml-1 text-xs text-warning">⚡ Auto-detected</span>
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

      {!isCompleted && (
        <div className="p-4 border-t bg-card">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={INTERVIEW_STEPS[step]?.placeholder}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function generateChecklist(project: any, lastInput: string, currentStep: number): RequirementItem[] {
  const items: RequirementItem[] = [];
  const id = () => crypto.randomUUID();

  // Get latest metadata (built up from steps already processed)
  const md = project.metadata;
  // Parse transit from last input since it might be the transit step
  const transitUSA = currentStep === 3 ? /^y/i.test(lastInput.trim()) : md.transitViaUSA;

  // Determine destination - might come from step index 1
  const dest = md.destination?.toLowerCase() || '';

  items.push({ id: id(), title: 'Valid passports for all travelers', checked: false });
  items.push({ id: id(), title: 'Travel insurance purchased', checked: false });
  items.push({ id: id(), title: 'Copies of all booking confirmations', checked: false });
  items.push({ id: id(), title: 'Emergency contact information sheet', checked: false });

  if (dest.includes('belize')) {
    items.push({
      id: id(),
      title: 'Complete Digital E-Embarkation Form at ideclare.gov.bz',
      checked: false,
      autoAdded: true,
      url: 'https://ideclare.gov.bz',
      url_label: 'Official Belize Immigration Portal',
    });
  }

  const hasMinors = md.travelers?.some((t: any) => t.isMinor) || false;
  if (hasMinors && transitUSA) {
    items.push({
      id: id(),
      title: 'Notarized Consent Letters for minor travelers (required for USA transit)',
      checked: false,
      autoAdded: true,
    });
  }

  if (transitUSA) {
    items.push({
      id: id(),
      title: 'ESTA authorization for USA transit',
      checked: false,
      autoAdded: true,
      url: 'https://esta.cbp.dhs.gov',
      url_label: 'ESTA Application Portal',
    });
  }

  return items;
}
