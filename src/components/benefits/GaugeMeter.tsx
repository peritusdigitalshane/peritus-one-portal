import { cn } from "@/lib/utils";

type ConfidenceLevel = 'low' | 'medium' | 'high';
type StatusType = 'not_started' | 'in_progress' | 'completed';

interface GaugeMeterProps {
  label: string;
  status?: StatusType;
  confidence?: ConfidenceLevel;
  className?: string;
}

const statusColors: Record<StatusType, { bg: string; text: string; label: string }> = {
  not_started: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Started' },
  in_progress: { bg: 'bg-amber-500', text: 'text-amber-950', label: 'In Progress' },
  completed: { bg: 'bg-green-500', text: 'text-green-950', label: 'Completed' },
};

const confidenceColors: Record<ConfidenceLevel, { gradient: string; label: string }> = {
  low: { gradient: 'from-red-500 to-orange-500', label: 'Low' },
  medium: { gradient: 'from-amber-500 to-yellow-500', label: 'Medium' },
  high: { gradient: 'from-green-500 to-emerald-500', label: 'High' },
};

export const GaugeMeter = ({
  label,
  status,
  confidence,
  className,
}: GaugeMeterProps) => {
  const showStatus = !!status;
  const showConfidence = !!confidence;

  return (
    <div className={cn("flex flex-col items-center gap-3 p-4 rounded-xl bg-card border", className)}>
      <span className="text-sm font-medium text-foreground text-center">{label}</span>
      
      {showStatus && status && (
        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-semibold",
          statusColors[status].bg,
          statusColors[status].text
        )}>
          {statusColors[status].label}
        </div>
      )}
      
      {showConfidence && confidence && (
        <div className="w-full">
          {/* Gauge visualization */}
          <div className="relative h-16 w-full overflow-hidden">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 10 45 A 40 40 0 0 1 90 45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
                strokeLinecap="round"
              />
              {/* Colored arc based on confidence */}
              <path
                d="M 10 45 A 40 40 0 0 1 90 45"
                fill="none"
                stroke={`url(#gauge-${confidence})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${confidence === 'low' ? 40 : confidence === 'medium' ? 75 : 115} 200`}
              />
              {/* Needle */}
              <g transform={`rotate(${confidence === 'low' ? -45 : confidence === 'medium' ? 0 : 45}, 50, 45)`}>
                <line
                  x1="50"
                  y1="45"
                  x2="50"
                  y2="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-foreground"
                />
                <circle cx="50" cy="45" r="4" className="fill-foreground" />
              </g>
              <defs>
                <linearGradient id="gauge-low" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="gauge-medium" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
                <linearGradient id="gauge-high" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className={cn(
            "mx-auto w-fit px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r",
            confidenceColors[confidence].gradient
          )}>
            {confidenceColors[confidence].label}
          </div>
        </div>
      )}
    </div>
  );
};
