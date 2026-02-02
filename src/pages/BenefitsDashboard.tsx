import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, TrendingUp, CheckCircle, Calendar } from "lucide-react";
import { useBenefits } from "@/hooks/useBenefits";
import { useAuth } from "@/hooks/useAuth";
import { CircularProgress } from "@/components/benefits/CircularProgress";
import { GaugeMeter } from "@/components/benefits/GaugeMeter";
import { InitiativeChecklist } from "@/components/benefits/InitiativeChecklist";
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

  const completedInitiatives = initiatives.filter(i => i.is_completed).length;
  const totalInitiatives = initiatives.length;

  return (
    <DashboardLayout
      title="Benefits Realisation"
      subtitle={objective?.subtitle || "Tracking Tangible & Intangible Benefits"}
    >
      <div className="p-6 space-y-6">
        {/* Business Objective Header */}
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Business Objective: {objective?.title || "Loading..."}
              </h2>
              <p className="text-muted-foreground">
                {objective?.subtitle || "Tracking Tangible & Intangible Benefits"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tangible Benefits</p>
                <p className="text-2xl font-bold">{tangibleBenefits.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Intangible Benefits</p>
                <p className="text-2xl font-bold">{intangibleBenefits.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Initiatives Complete</p>
                <p className="text-2xl font-bold">{completedInitiatives}/{totalInitiatives}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roadmap Items</p>
                <p className="text-2xl font-bold">{roadmapItems.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tangible Benefits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Tangible Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 py-4">
                {tangibleBenefits.map((benefit) => (
                  <CircularProgress
                    key={benefit.id}
                    percentage={benefit.target_percentage || 0}
                    label={benefit.name}
                  />
                ))}
                {tangibleBenefits.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No tangible benefits added yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Initiatives */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Key Initiatives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InitiativeChecklist initiatives={initiatives} className="py-2" />
            </CardContent>
          </Card>

          {/* Intangible Benefits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                Intangible Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 py-2">
                {intangibleBenefits.map((benefit) => (
                  <GaugeMeter
                    key={benefit.id}
                    label={benefit.name}
                    status={benefit.status}
                    confidence={benefit.confidence}
                  />
                ))}
                {intangibleBenefits.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No intangible benefits added yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoadmapTimeline items={roadmapItems} />
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Tangible Benefits on Track, Intangible Benefits Advancing – Clear Path to Outcomes
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BenefitsDashboard;
