import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Phase1Interview from "@/pages/Phase1Interview";
import Phase2Itinerary from "@/pages/Phase2Itinerary";
import Phase3Packing from "@/pages/Phase3Packing";
import Roadmap from "@/pages/Roadmap";
import ExportPreview from "@/pages/ExportPreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      staleTime: 1000 * 60 * 60, // 1 hour
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProjectsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/project/:projectId/interview" element={<Phase1Interview />} />
              <Route path="/project/:projectId/itinerary" element={<Phase2Itinerary />} />
              <Route path="/project/:projectId/packing" element={<Phase3Packing />} />
              <Route path="/project/:projectId/export" element={<ExportPreview />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectsProvider>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
