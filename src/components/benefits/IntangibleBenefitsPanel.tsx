import { cn } from "@/lib/utils";
import { GaugeMeter } from "./GaugeMeter";
import type { InitiativeStatus, ConfidenceLevel } from "@/hooks/useOrgBenefits";

interface BenefitLike {
  id: string;
  name: string;
  status: InitiativeStatus;
  confidence: ConfidenceLevel;
}

interface IntangibleBenefitsPanelProps {
  benefits: BenefitLike[];
  className?: string;
}

export const IntangibleBenefitsPanel = ({ benefits, className }: IntangibleBenefitsPanelProps) => {
  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden h-full", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3">
        <h2 className="text-white font-semibold text-center">Intangible Benefits</h2>
      </div>

      {/* Content */}
      <div className="p-4">
        {benefits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {benefits.map((benefit) => (
              <GaugeMeter
                key={benefit.id}
                label={benefit.name}
                status={benefit.status}
                confidence={benefit.confidence}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No intangible benefits added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
