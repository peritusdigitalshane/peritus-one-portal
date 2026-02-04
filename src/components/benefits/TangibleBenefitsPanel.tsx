import { cn } from "@/lib/utils";
import { CircularProgress } from "./CircularProgress";

interface BenefitLike {
  id: string;
  name: string;
  target_percentage: number | null;
}

interface TangibleBenefitsPanelProps {
  benefits: BenefitLike[];
  className?: string;
}

export const TangibleBenefitsPanel = ({ benefits, className }: TangibleBenefitsPanelProps) => {
  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden h-full", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
        <h2 className="text-white font-semibold text-center">Tangible Benefits</h2>
      </div>

      {/* Content - 2x2 Grid */}
      <div className="p-4">
        {benefits.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <CircularProgress
                key={benefit.id}
                percentage={benefit.target_percentage || 0}
                label={benefit.name}
                size={100}
                strokeWidth={10}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No tangible benefits added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
