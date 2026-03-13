import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import MyEntries from "./pages/MyEntries.tsx";
import VacationRequests from "./pages/VacationRequests.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminVacationApprovals from "./pages/AdminVacationApprovals.tsx";
import LongSickLeave from "./pages/LongSickLeave.tsx";
import TravelExpenses from "./pages/TravelExpenses.tsx";
import MyStatistics from "./pages/MyStatistics.tsx";
import SettingsPage from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/my-entries" element={<MyEntries />} />
          <Route path="/vacation-requests" element={<VacationRequests />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/vacation-approvals" element={<AdminVacationApprovals />} />
          <Route path="/long-sick-leave" element={<LongSickLeave />} />
          <Route path="/travel-expenses" element={<TravelExpenses />} />
          <Route path="/my-statistics" element={<MyStatistics />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
