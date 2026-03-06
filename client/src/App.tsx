import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Demographics from "./pages/Demographics";
import UploadBill from "./pages/UploadBill";
import UploadPolicy from "./pages/UploadPolicy";
import DenialCheck from "./pages/DenialCheck";
import IncomeWaiver from "./pages/IncomeWaiver";
import Results from "./pages/Results";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";
import ChatBot from "./components/ChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Index />} />
          <Route path="/demographics" element={<Demographics />} />
          <Route path="/upload-bill" element={<UploadBill />} />
          <Route path="/upload-policy" element={<UploadPolicy />} />
          <Route path="/denial-check" element={<DenialCheck />} />
          <Route path="/income-waiver" element={<IncomeWaiver />} />
          <Route path="/results" element={<Results />} />
          <Route path="/resources" element={<Resources />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
