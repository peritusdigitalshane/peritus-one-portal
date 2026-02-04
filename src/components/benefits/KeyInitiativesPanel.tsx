import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface InitiativeLike {
  id: string;
  name: string;
  is_completed: boolean;
  progress_percentage: number;
}

interface KeyInitiativesPanelProps {
  initiatives: InitiativeLike[];
  className?: string;
}

export const KeyInitiativesPanel = ({ initiatives, className }: KeyInitiativesPanelProps) => {
  const completedCount = initiatives.filter(i => i.is_completed).length;
  const totalCount = initiatives.length;

  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-amber-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

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
          <div className="space-y-2">
            {initiatives.map((initiative) => {
              const progress = initiative.is_completed ? 100 : (initiative.progress_percentage || 0);
              
              return (
                <div
                  key={initiative.id}
                  className={cn(
                    "p-3 rounded-lg transition-all",
                    "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {/* Top row: checkbox, name, status */}
                  <div className="flex items-center gap-3 mb-2">
                    {/* Checkbox icon */}
                    <div
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all",
                        initiative.is_completed
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                          : "bg-white border-2 border-muted-foreground/20"
                      )}
                    >
                      {initiative.is_completed && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
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

                    {/* Progress percentage badge */}
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        progress >= 100 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : progress >= 50
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      {progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        getProgressColor(progress)
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
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
