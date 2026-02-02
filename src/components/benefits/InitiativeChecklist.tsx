import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyInitiative } from "@/hooks/useBenefits";

interface InitiativeChecklistProps {
  initiatives: KeyInitiative[];
  className?: string;
}

export const InitiativeChecklist = ({ initiatives, className }: InitiativeChecklistProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Key Initiatives</h3>
      <div className="space-y-2">
        {initiatives.map((initiative) => (
          <div
            key={initiative.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              initiative.is_completed 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-card border-border"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                initiative.is_completed
                  ? "bg-green-500 text-white"
                  : "border-2 border-muted-foreground/30"
              )}
            >
              {initiative.is_completed && <Check className="w-4 h-4" />}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                initiative.is_completed
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {initiative.name}
            </span>
          </div>
        ))}
        {initiatives.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No initiatives added yet
          </p>
        )}
      </div>
    </div>
  );
};
