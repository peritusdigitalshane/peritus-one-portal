import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyInitiative } from "@/hooks/useBenefits";

interface KeyInitiativesPanelProps {
  initiatives: KeyInitiative[];
  className?: string;
}

export const KeyInitiativesPanel = ({ initiatives, className }: KeyInitiativesPanelProps) => {
  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden h-full", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-4 py-3">
        <h2 className="text-white font-semibold text-center">Key Initiatives</h2>
      </div>

      {/* Content */}
      <div className="p-4">
        {initiatives.length > 0 ? (
          <div className="space-y-2">
            {initiatives.map((initiative) => (
              <div
                key={initiative.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  "hover:shadow-sm",
                  initiative.is_completed 
                    ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" 
                    : "bg-muted/30 border-border"
                )}
              >
                {/* Checkbox icon */}
                <div
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors",
                    initiative.is_completed
                      ? "bg-green-500 text-white"
                      : "border-2 border-muted-foreground/40"
                  )}
                >
                  {initiative.is_completed && <Check className="w-4 h-4" />}
                </div>
                
                {/* Initiative name */}
                <span
                  className={cn(
                    "text-sm font-medium flex-1",
                    initiative.is_completed
                      ? "text-green-700 dark:text-green-300"
                      : "text-foreground"
                  )}
                >
                  {initiative.name}
                </span>

                {/* Status indicator */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    initiative.is_completed
                      ? "bg-blue-500"
                      : "bg-muted"
                  )}
                >
                  {initiative.is_completed && (
                    <Check className="w-3 h-3 text-white" />
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
