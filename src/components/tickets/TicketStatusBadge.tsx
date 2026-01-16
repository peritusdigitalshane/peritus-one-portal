import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/hooks/useTickets";

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  open: { label: "Open", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  pending: { label: "Pending", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-muted" },
};

export const TicketStatusBadge = ({ status }: TicketStatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};
