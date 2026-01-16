import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { SLAIndicator } from "./SLAIndicator";
import type { Ticket } from "@/hooks/useTickets";
import { Eye, MessageSquare } from "lucide-react";

interface TicketListProps {
  tickets: Ticket[];
  onViewTicket: (ticketId: string) => void;
}

export const TicketList = ({ tickets, onViewTicket }: TicketListProps) => {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
          <p className="text-muted-foreground">
            You haven't created any support tickets. Click "New Ticket" to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-mono text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                  <TicketCategoryBadge category={ticket.category} />
                </div>
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {ticket.subject}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  <SLAIndicator slaDueAt={ticket.sla_due_at} status={ticket.status} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewTicket(ticket.id)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
