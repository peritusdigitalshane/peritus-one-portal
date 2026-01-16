import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow, isPast, differenceInHours } from "date-fns";
import type { TicketStatus } from "@/hooks/useTickets";

interface SLAIndicatorProps {
  slaDueAt: string | null;
  status: TicketStatus;
}

export const SLAIndicator = ({ slaDueAt, status }: SLAIndicatorProps) => {
  if (!slaDueAt) return null;
  
  // If resolved or closed, don't show SLA
  if (status === "resolved" || status === "closed") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Completed</span>
      </div>
    );
  }

  const dueDate = new Date(slaDueAt);
  const isBreached = isPast(dueDate);
  const hoursRemaining = differenceInHours(dueDate, new Date());
  const isAtRisk = !isBreached && hoursRemaining <= 2;

  if (isBreached) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-red-600">
        <AlertTriangle className="w-4 h-4" />
        <span>SLA Breached ({formatDistanceToNow(dueDate, { addSuffix: true })})</span>
      </div>
    );
  }

  if (isAtRisk) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-yellow-600">
        <Clock className="w-4 h-4" />
        <span>Due {formatDistanceToNow(dueDate, { addSuffix: true })}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span>Due {formatDistanceToNow(dueDate, { addSuffix: true })}</span>
    </div>
  );
};
