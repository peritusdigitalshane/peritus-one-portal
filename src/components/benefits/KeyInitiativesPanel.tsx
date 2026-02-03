import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyInitiative } from "@/hooks/useBenefits";

interface KeyInitiativesPanelProps {
  initiatives: KeyInitiative[];
  className?: string;
}

export const KeyInitiativesPanel = ({ initiatives, className }: KeyInitiativesPanelProps) => {
  const completedCount = initiatives.filter(i => i.is_completed).length;
  const totalCount = initiatives.length;

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden h-full", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-4 py-3 flex items-center justify-between">
        <h2 className="text-white font-semibold">Key Initiatives</h2>
        {totalCount > 0 && (
          <span className="text-white/80 text-sm font-medium">
            {completedCount}/{totalCount} Complete
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {initiatives.length > 0 ? (
          <div className="space-y-1.5">
            {initiatives.map((initiative) => (
              <div
                key={initiative.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "bg-muted/30 hover:bg-muted/50"
                )}
              >
                {/* Checkbox icon - Yellow/Green style like reference */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all shadow-sm",
                    initiative.is_completed
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                      : "bg-white border-2 border-muted-foreground/20"
                  )}
                >
                  {initiative.is_completed && (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  )}
                </div>
                
                {/* Initiative name */}
                <span
                  className={cn(
                    "text-sm font-medium flex-1 leading-tight",
                    initiative.is_completed
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {initiative.name}
                </span>

                {/* Status indicator - Blue circle like reference */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                    initiative.is_completed
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"
                      : "bg-muted/50 border border-muted-foreground/20"
                  )}
                >
                  {initiative.is_completed && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No initiatives added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
