import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { SLAIndicator } from "./SLAIndicator";
import { useTicket } from "@/hooks/useTickets";
import { Loader2, Send, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TicketDetailDialogProps {
  ticketId: string | null;
  onOpenChange: (open: boolean) => void;
}

export const TicketDetailDialog = ({ ticketId, onOpenChange }: TicketDetailDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const { ticket, loadingTicket, comments, loadingComments, addComment } = useTicket(ticketId || "");

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ comment: newComment });
    setNewComment("");
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (!ticketId) return null;

  return (
    <Dialog open={!!ticketId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loadingTicket ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="font-mono text-muted-foreground">
                  {ticket?.ticket_number}
                </span>
                <span className="text-foreground">{ticket?.subject}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {loadingTicket ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : ticket ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ticket Info */}
            <div className="space-y-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketCategoryBadge category={ticket.category} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
                <div>
                  <SLAIndicator slaDueAt={ticket.sla_due_at} status={ticket.status} />
                </div>
                {ticket.assignee && (
                  <div>
                    <span className="text-muted-foreground">Assigned to:</span>{" "}
                    {ticket.assignee.full_name || ticket.assignee.email}
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.resolution_notes && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-green-700">Resolution</h4>
                  <p className="text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="flex-1 flex flex-col overflow-hidden pt-4">
              <h4 className="font-medium mb-4">
                Comments {comments && `(${comments.length})`}
              </h4>

              <ScrollArea className="flex-1 max-h-[250px] pr-4">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {comment.user ? getInitials(comment.user.full_name, comment.user.email) : <User className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.user?.full_name || comment.user?.email || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm bg-muted/50 rounded-lg p-3">
                            {comment.comment}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                )}
              </ScrollArea>

              {/* Add Comment - Only show if ticket is not closed */}
              {ticket.status !== "closed" && (
                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addComment.isPending}
                    className="self-end"
                  >
                    {addComment.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
