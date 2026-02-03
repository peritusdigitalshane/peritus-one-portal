import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  className?: string;
}

export const CircularProgress = ({
  percentage,
  size = 100,
  strokeWidth = 10,
  label,
  className,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Generate unique gradient ID to avoid conflicts when multiple instances exist
  const gradientId = useMemo(() => `progress-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div 
        className="relative bg-gradient-to-b from-blue-950 to-blue-900 rounded-full p-2"
        style={{ width: size + 16, height: size + 16 }}
      >
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out drop-shadow-lg"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{percentage}%</span>
        </div>
      </div>
      <span className="text-xs text-center font-medium text-foreground max-w-[100px] leading-tight">
        {label}
      </span>
    </div>
  );
};
