import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";
import { useBenefits } from "@/hooks/useBenefits";
import { useAuth } from "@/hooks/useAuth";
import { BenefitsHeader } from "@/components/benefits/BenefitsHeader";
import { TangibleBenefitsPanel } from "@/components/benefits/TangibleBenefitsPanel";
import { KeyInitiativesPanel } from "@/components/benefits/KeyInitiativesPanel";
import { IntangibleBenefitsPanel } from "@/components/benefits/IntangibleBenefitsPanel";
import { RoadmapTimeline } from "@/components/benefits/RoadmapTimeline";

const BenefitsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    tangibleBenefits,
    intangibleBenefits,
    initiatives,
    roadmapItems,
    objective,
    hasAccess,
    loading,
  } = useBenefits();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!loading && !authLoading && !hasAccess) {
      navigate("/dashboard");
    }
  }, [hasAccess, loading, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <DashboardLayout title="Benefits Realisation" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <DashboardLayout
      title="Benefits Realisation"
      subtitle={objective?.subtitle || "Tracking Tangible & Intangible Benefits"}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Business Objective Header */}
        <BenefitsHeader 
          title={objective?.title || "Business Objective"} 
          subtitle={objective?.subtitle || "Tracking Tangible & Intangible Benefits"}
        />

        {/* Main 3-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Tangible Benefits */}
          <div className="lg:col-span-4">
            <TangibleBenefitsPanel benefits={tangibleBenefits} />
          </div>

          {/* Center: Key Initiatives */}
          <div className="lg:col-span-4">
            <KeyInitiativesPanel initiatives={initiatives} />
          </div>

          {/* Right: Intangible Benefits */}
          <div className="lg:col-span-4">
            <IntangibleBenefitsPanel benefits={intangibleBenefits} />
          </div>
        </div>

        {/* Bottom: Roadmap Timeline */}
        <div className="bg-card border rounded-xl p-4 overflow-hidden">
          <RoadmapTimeline items={roadmapItems} />
          <p className="text-center text-sm text-muted-foreground mt-4 italic">
            Tangible Benefits on Track, Intangible Benefits Advancing – Clear Path to Outcomes
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BenefitsDashboard;
