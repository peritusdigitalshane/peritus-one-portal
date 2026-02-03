import { cn } from "@/lib/utils";
import { useMemo } from "react";

type ConfidenceLevel = 'low' | 'medium' | 'high';
type StatusType = 'not_started' | 'in_progress' | 'completed';

interface GaugeMeterProps {
  label: string;
  status?: StatusType;
  confidence?: ConfidenceLevel;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; label: string; borderColor: string }> = {
  not_started: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', label: 'Not Started', borderColor: 'border-slate-300 dark:border-slate-600' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300', label: 'In Progress', borderColor: 'border-amber-300 dark:border-amber-600' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', label: 'Completed', borderColor: 'border-green-300 dark:border-green-600' },
};

const confidenceConfig: Record<ConfidenceLevel, { color: string; bgColor: string; label: string }> = {
  low: { color: '#ef4444', bgColor: 'bg-red-500', label: 'Low' },
  medium: { color: '#f59e0b', bgColor: 'bg-amber-500', label: 'Medium' },
  high: { color: '#22c55e', bgColor: 'bg-green-500', label: 'High' },
};

export const GaugeMeter = ({
  label,
  status,
  confidence,
  className,
}: GaugeMeterProps) => {
  const gradientId = useMemo(() => `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  // Calculate needle rotation: -60 for low, 0 for medium, 60 for high
  const getNeedleRotation = () => {
    if (!confidence) return 0;
    const rotations: Record<ConfidenceLevel, number> = {
      low: -50,
      medium: 0,
      high: 50,
    };
    return rotations[confidence];
  };

  // Calculate arc length for the gauge
  const getArcLength = () => {
    if (!confidence) return 0;
    const lengths: Record<ConfidenceLevel, number> = {
      low: 35,
      medium: 65,
      high: 100,
    };
    return lengths[confidence];
  };

  return (
    <div className={cn("flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30 border", className)}>
      {/* Label at top */}
      <span className="text-sm font-semibold text-foreground text-center">{label}</span>
      
      {/* Status pill (if status is set) */}
      {status && (
        <div className={cn(
          "px-4 py-1.5 rounded-full text-xs font-semibold border",
          statusConfig[status].bg,
          statusConfig[status].text,
          statusConfig[status].borderColor
        )}>
          {statusConfig[status].label}
        </div>
      )}
      
      {/* Gauge visualization (if confidence is set) */}
      {confidence && (
        <div className="w-full max-w-[140px]">
          <div className="relative h-20 w-full overflow-hidden">
            <svg viewBox="0 0 100 55" className="w-full h-full">
              {/* Background arc - lighter gray */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Progress arc with gradient */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${getArcLength()} 130`}
                className="transition-all duration-500"
              />
              {/* Needle */}
              <g 
                className="transition-transform duration-500"
                style={{ transformOrigin: '50px 50px', transform: `rotate(${getNeedleRotation()}deg)` }}
              >
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="20"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="5" fill="hsl(var(--foreground))" />
              </g>
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {/* Confidence label pill */}
          <div className={cn(
            "mx-auto w-fit px-4 py-1 rounded-full text-xs font-bold text-white shadow-sm",
            confidenceConfig[confidence].bgColor
          )}>
            {confidenceConfig[confidence].label}
          </div>
        </div>
      )}
    </div>
  );
};
