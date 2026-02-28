import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Phase1Interview from "@/pages/Phase1Interview";
import Phase2Itinerary from "@/pages/Phase2Itinerary";
import Phase3Packing from "@/pages/Phase3Packing";
import Roadmap from "@/pages/Roadmap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
