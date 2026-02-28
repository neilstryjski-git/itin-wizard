export interface TravelLink {
  label: string;
  url: string;
}

export interface RequirementItem {
  id: string;
  text: string;
  checked: boolean;
  autoAdded?: boolean;
}

export interface ItineraryEvent {
  id: string;
  type: 'flight-departure' | 'flight-arrival' | 'check-in' | 'check-out' | 'activity' | 'transfer';
  title: string;
  date: string; // ISO date
  time?: string; // HH:mm
  location?: string;
  notes?: string;
  links: TravelLink[];
  confirmationCode?: string;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  autoAdded?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  options?: string[];
}

export interface TravelProject {
  project_id: string;
  metadata: {
    name: string;
    destination: string;
    startDate?: string;
    endDate?: string;
    travelers: { name: string; isMinor: boolean }[];
    transitViaUSA: boolean;
    createdAt: string;
    updatedAt: string;
  };
  phase_1_requirements: {
    completed: boolean;
    chatHistory: ChatMessage[];
    checklist: RequirementItem[];
  };
  phase_2_itinerary: {
    rawInput: string;
    events: ItineraryEvent[];
  };
  phase_3_packing: {
    items: PackingItem[];
    generated: boolean;
  };
}

export const createNewProject = (): TravelProject => ({
  project_id: crypto.randomUUID(),
  metadata: {
    name: '',
    destination: '',
    travelers: [],
    transitViaUSA: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  phase_1_requirements: {
    completed: false,
    chatHistory: [],
    checklist: [],
  },
  phase_2_itinerary: {
    rawInput: '',
    events: [],
  },
  phase_3_packing: {
    items: [],
    generated: false,
  },
});
