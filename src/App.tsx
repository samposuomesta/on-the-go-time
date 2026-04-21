import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { PushSubscriptionProvider } from "@/components/PushSubscriptionProvider";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import MyEntries from "./pages/MyEntries.tsx";
import WeeklyGoals from "./pages/WeeklyGoals.tsx";
import VacationRequests from "./pages/VacationRequests.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminVacationApprovals from "./pages/AdminVacationApprovals.tsx";
import LongSickLeave from "./pages/LongSickLeave.tsx";
import TravelExpenses from "./pages/TravelExpenses.tsx";
import MyStatistics from "./pages/MyStatistics.tsx";
import SettingsPage from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuthContext();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!userId) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/my-entries" element={<ProtectedRoute><MyEntries /></ProtectedRoute>} />
      <Route path="/weekly-goals" element={<ProtectedRoute><WeeklyGoals /></ProtectedRoute>} />
      <Route path="/vacation-requests" element={<ProtectedRoute><VacationRequests /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/vacation-approvals" element={<ProtectedRoute><AdminVacationApprovals /></ProtectedRoute>} />
      <Route path="/long-sick-leave" element={<ProtectedRoute><LongSickLeave /></ProtectedRoute>} />
      <Route path="/travel-expenses" element={<ProtectedRoute><TravelExpenses /></ProtectedRoute>} />
      <Route path="/my-statistics" element={<ProtectedRoute><MyStatistics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PushSubscriptionProvider />
            <UpdatePrompt />
            <AuthRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
