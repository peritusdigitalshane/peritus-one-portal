import { cn } from "@/lib/utils";

interface BenefitsHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export const BenefitsHeader = ({ title, subtitle, className }: BenefitsHeaderProps) => {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl p-6 text-center",
        "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500",
        className
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-4 -top-4 w-32 h-32 bg-white rounded-full blur-2xl" />
        <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-white rounded-full blur-2xl" />
      </div>
      
      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Business Objective: <span className="font-semibold">{title}</span>
        </h1>
        <p className="text-blue-100 text-sm md:text-base">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
