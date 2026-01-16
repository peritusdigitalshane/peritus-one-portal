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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { TicketPriorityBadge } from "@/components/tickets/TicketPriorityBadge";
import { TicketCategoryBadge } from "@/components/tickets/TicketCategoryBadge";
import { SLAIndicator } from "@/components/tickets/SLAIndicator";
import { useTicket, useAdminTickets, type TicketStatus, type TicketPriority } from "@/hooks/useTickets";
import { Loader2, Send, User, Lock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminTicketDialogProps {
  ticketId: string | null;
  onOpenChange: (open: boolean) => void;
}

export const AdminTicketDialog = ({ ticketId, onOpenChange }: AdminTicketDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const { ticket, loadingTicket, comments, loadingComments, addComment } = useTicket(ticketId || "");
  const { supportUsers, updateTicket } = useAdminTickets();

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ comment: newComment, isInternal });
    setNewComment("");
    setIsInternal(false);
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticketId) return;
    
    const updates: any = { status };
    
    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }
    } else if (status === "closed") {
      updates.closed_at = new Date().toISOString();
    }
    
    await updateTicket.mutateAsync({ ticketId, updates });
  };

  const handleAssignmentChange = async (userId: string) => {
    if (!ticketId) return;
    await updateTicket.mutateAsync({
      ticketId,
      updates: { assigned_to: userId === "unassigned" ? null : userId },
    });
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    if (!ticketId) return;
    await updateTicket.mutateAsync({ ticketId, updates: { priority } });
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
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
          <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="comments">
                    Comments {comments && `(${comments.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 overflow-auto">
                  <div className="space-y-4 py-4">
                    {/* Customer Info */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        Customer
                      </h4>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {ticket.user ? getInitials(ticket.user.full_name, ticket.user.email) : <User />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{ticket.user?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{ticket.user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>Created: {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        {ticket.resolved_at && (
                          <p>Resolved: {format(new Date(ticket.resolved_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        )}
                        {ticket.closed_at && (
                          <p>Closed: {format(new Date(ticket.closed_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        )}
                      </div>
                    </div>

                    {/* Resolution Notes (if resolved) */}
                    {ticket.resolution_notes && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-medium mb-2 text-green-700 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Resolution Notes
                        </h4>
                        <p className="text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
                      </div>
                    )}

                    {/* Resolution Form (if not resolved) */}
                    {ticket.status !== "resolved" && ticket.status !== "closed" && (
                      <div>
                        <h4 className="font-medium mb-2">Resolution Notes</h4>
                        <Textarea
                          placeholder="Add resolution notes before marking as resolved..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 max-h-[300px] pr-4 py-4">
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
                                {comment.is_internal && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Lock className="w-3 h-3" />
                                    Internal
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-sm rounded-lg p-3 ${comment.is_internal ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/50"}`}>
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

                  {/* Add Comment */}
                  {ticket.status !== "closed" && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="internal"
                          checked={isInternal}
                          onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                        />
                        <Label htmlFor="internal" className="text-sm flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Internal note (not visible to customer)
                        </Label>
                      </div>
                      <div className="flex gap-2">
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
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-64 space-y-4 border-t lg:border-t-0 lg:border-l lg:pl-6 pt-4 lg:pt-0">
              <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                <TicketCategoryBadge category={ticket.category} />
                <SLAIndicator slaDueAt={ticket.sla_due_at} status={ticket.status} />
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                  disabled={updateTicket.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Priority</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => handlePriorityChange(value as TicketPriority)}
                  disabled={updateTicket.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Assigned To</Label>
                <Select
                  value={ticket.assigned_to || "unassigned"}
                  onValueChange={handleAssignmentChange}
                  disabled={updateTicket.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {supportUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                {ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={() => handleStatusChange("resolved")}
                    disabled={updateTicket.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                )}
                {ticket.status === "resolved" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStatusChange("closed")}
                    disabled={updateTicket.isPending}
                  >
                    Close Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
