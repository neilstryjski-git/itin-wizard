export interface TravelLink {
  label: string;
  url: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 data URI
  addedAt: string;
}

export interface RequirementItem {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  status?: 'pending' | 'done';
  url?: string;
  url_label?: string;
  autoAdded?: boolean;
}

export interface ItineraryEvent {
  id: string;
  type: 'flight' | 'check-in' | 'check-out' | 'activity' | 'transfer' | 'accommodation';
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  departureTime?: string;
  arrivalTime?: string;
  notes?: string;
  links: TravelLink[];
  confirmationCode?: string;
  flightNumber?: string;
  address?: string;
  missingFields?: string[];
  attachments?: FileAttachment[];
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  assignedTo?: string;
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
    travelers: { name: string; isMinor: boolean; passport?: string }[];
    transitViaUSA: boolean;
    transitCountry?: string;
    createdAt: string;
    updatedAt: string;
    status?: 'active' | 'archived';
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
    status: 'active',
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
