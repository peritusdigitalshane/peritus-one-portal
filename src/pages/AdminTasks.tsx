import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TaskManagement } from "@/components/admin/tasks/TaskManagement";
import { Loader2 } from "lucide-react";

const AdminTasks = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAccess = roles?.some(r => r.role === 'super_admin');
      
      if (!hasAccess) {
        navigate('/dashboard');
        return;
      }

      setIsSuperAdmin(true);
      setIsLoading(false);
    };

    checkAccess();
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout title="Task Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <DashboardLayout title="Task Management" subtitle="Manage admin tasks, track time, and monitor progress">
      <div className="p-6 space-y-6">
        <div>
        </div>
        <TaskManagement />
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
