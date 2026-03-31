import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import Index from "./pages/Index.tsx";
import Profile from "./pages/Profile.tsx";
import Library from "./pages/Library.tsx";
import BrainDump from "./pages/BrainDump.tsx";
import AskLibrarian from "./pages/AskLibrarian.tsx";
import FocusPage from "./pages/FocusPage.tsx";
import BreakPage from "./pages/BreakPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import GroupStudy from "./pages/GroupStudy.tsx";
import StudyRoom from "./pages/StudyRoom.tsx";
import JoinRoom from "./pages/JoinRoom.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PomodoroProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/library" element={<Library />} />
            <Route path="/braindump" element={<BrainDump />} />
            <Route path="/ask-librarian" element={<AskLibrarian />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/break" element={<BreakPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PomodoroProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
