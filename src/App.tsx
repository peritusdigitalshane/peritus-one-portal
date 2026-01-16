import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import PurchaseManagement from "./pages/PurchaseManagement";
import AdminTickets from "./pages/AdminTickets";
import Plans from "./pages/Plans";
import Shop from "./pages/Shop";
import Invoices from "./pages/Invoices";
import Billing from "./pages/Billing";
import MyServices from "./pages/MyServices";
import SupportTickets from "./pages/SupportTickets";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Features from "./pages/Features";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/super-admin" element={<SuperAdminPortal />} />
            <Route path="/super-admin/purchases" element={<PurchaseManagement />} />
            <Route path="/super-admin/tickets" element={<AdminTickets />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/support" element={<Support />} />
            <Route path="/features" element={<Features />} />
            <Route path="/dashboard/shop" element={<Shop />} />
            <Route path="/dashboard/invoices" element={<Invoices />} />
            <Route path="/dashboard/billing" element={<Billing />} />
            <Route path="/dashboard/services" element={<MyServices />} />
            <Route path="/dashboard/tickets" element={<SupportTickets />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
