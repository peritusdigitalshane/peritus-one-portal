import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTickets, type TicketCategory, type TicketPriority } from "@/hooks/useTickets";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  category: z.enum(["incident", "service_request", "problem", "change_request"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Please provide more detail (at least 20 characters)"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryDescriptions: Record<TicketCategory, string> = {
  incident: "Something is broken or not working as expected",
  service_request: "Request for access, information, or standard service",
  problem: "Investigate root cause of recurring issues",
  change_request: "Request a modification or new feature",
};

const priorityDescriptions: Record<TicketPriority, { label: string; sla: string }> = {
  critical: { label: "Business-critical impact, complete outage", sla: "4 hour response" },
  high: { label: "Significant impact, major functionality affected", sla: "8 hour response" },
  medium: { label: "Moderate impact, workaround available", sla: "24 hour response" },
  low: { label: "Minor impact, cosmetic or general inquiry", sla: "72 hour response" },
};

export const CreateTicketForm = ({ open, onOpenChange }: CreateTicketFormProps) => {
  const { createTicket } = useTickets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "incident",
      priority: "medium",
      subject: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createTicket.mutateAsync({
        category: data.category,
        priority: data.priority,
        subject: data.subject,
        description: data.description,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Submit a new support request. Please provide as much detail as possible.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="incident">🔥 Incident</SelectItem>
                        <SelectItem value="service_request">📋 Service Request</SelectItem>
                        <SelectItem value="problem">🔍 Problem</SelectItem>
                        <SelectItem value="change_request">🔄 Change Request</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {categoryDescriptions[field.value as TicketCategory]}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="critical">🔴 Critical</SelectItem>
                        <SelectItem value="high">🟠 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {priorityDescriptions[field.value as TicketPriority].sla}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe the issue in detail. Include steps to reproduce, expected behavior, and any error messages."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Ticket
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
