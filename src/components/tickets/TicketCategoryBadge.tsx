import { Badge } from "@/components/ui/badge";
import type { TicketCategory } from "@/hooks/useTickets";

interface TicketCategoryBadgeProps {
  category: TicketCategory;
}

const categoryConfig: Record<TicketCategory, { label: string; icon: string }> = {
  incident: { label: "Incident", icon: "🔥" },
  service_request: { label: "Service Request", icon: "📋" },
  problem: { label: "Problem", icon: "🔍" },
  change_request: { label: "Change Request", icon: "🔄" },
};

export const TicketCategoryBadge = ({ category }: TicketCategoryBadgeProps) => {
  const config = categoryConfig[category];
  return (
    <Badge variant="secondary" className="gap-1">
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  );
};
