import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TicketManagement } from "@/components/admin/TicketManagement";
import { Loader2 } from "lucide-react";

const AdminTickets = () => {
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [user, loading, isSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <DashboardLayout 
      title="Ticket Management"
      subtitle="View and manage all support tickets, assign to team members, and track SLAs."
    >
      <TicketManagement />
    </DashboardLayout>
  );
};

export default AdminTickets;
