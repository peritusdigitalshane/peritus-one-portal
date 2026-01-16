import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "@/hooks/useTickets";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
}

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: "P1", className: "bg-red-500 text-white border-red-600" },
  high: { label: "P2", className: "bg-orange-500 text-white border-orange-600" },
  medium: { label: "P3", className: "bg-yellow-500 text-black border-yellow-600" },
  low: { label: "P4", className: "bg-green-500 text-white border-green-600" },
};

export const TicketPriorityBadge = ({ priority }: TicketPriorityBadgeProps) => {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};
