import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BenefitsManager } from "@/components/admin/BenefitsManager";
import { Loader2 } from "lucide-react";

const AdminBenefits = () => {
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
      <DashboardLayout title="Benefits Management" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <DashboardLayout
      title="Benefits Management"
      subtitle="Manage benefits, initiatives, roadmap, and user access"
    >
      <div className="p-6">
        <BenefitsManager />
      </div>
    </DashboardLayout>
  );
};

export default AdminBenefits;
