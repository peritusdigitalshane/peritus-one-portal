import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrgBenefitsManager } from "@/components/admin/OrgBenefitsManager";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminOrgBenefits = () => {
  const { user, loading, isSuperAdmin } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    const fetchOrgName = async () => {
      if (orgId) {
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single();
        if (data) {
          setOrgName(data.name);
        }
      }
    };
    fetchOrgName();
  }, [orgId]);

  if (loading) {
    return (
      <DashboardLayout title="Benefits Management" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin || !orgId) {
    return null;
  }

  return (
    <DashboardLayout
      title="Organization Benefits"
      subtitle={orgName || "Managing benefits data"}
    >
      <div className="p-6">
        <OrgBenefitsManager organizationId={orgId} organizationName={orgName} />
      </div>
    </DashboardLayout>
  );
};

export default AdminOrgBenefits;
