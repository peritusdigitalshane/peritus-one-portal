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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTickets, type TicketCategory, type TicketPriority } from "@/hooks/useTickets";
import { Loader2, HelpCircle, ChevronDown } from "lucide-react";

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

const priorityDescriptions: Record<TicketPriority, { label: string; sla: string; description: string; examples: string }> = {
  critical: { 
    label: "P1 - Critical", 
    sla: "4 hour response",
    description: "Complete service outage or critical business function unavailable affecting multiple users",
    examples: "System down, unable to process orders, security breach"
  },
  high: { 
    label: "P2 - High", 
    sla: "8 hour response",
    description: "Major functionality impaired but workaround exists, or single user completely blocked",
    examples: "Key feature broken, significant performance issues, one user locked out"
  },
  medium: { 
    label: "P3 - Medium", 
    sla: "24 hour response",
    description: "Minor functionality affected, inconvenient but work can continue",
    examples: "Minor bugs, cosmetic issues, feature requests for existing workflow"
  },
  low: { 
    label: "P4 - Low", 
    sla: "72 hour response",
    description: "General questions, enhancement requests, or issues with minimal business impact",
    examples: "How-to questions, documentation requests, nice-to-have features"
  },
};

export const CreateTicketForm = ({ open, onOpenChange }: CreateTicketFormProps) => {
  const { createTicket } = useTickets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priorityGuideOpen, setPriorityGuideOpen] = useState(false);

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
            {/* Priority Guide */}
            <Collapsible open={priorityGuideOpen} onOpenChange={setPriorityGuideOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    How to choose the right priority?
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${priorityGuideOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  {(Object.entries(priorityDescriptions) as [TicketPriority, typeof priorityDescriptions[TicketPriority]][]).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          key === 'critical' ? 'bg-red-500' :
                          key === 'high' ? 'bg-orange-500' :
                          key === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="font-medium text-sm">{value.label}</span>
                        <span className="text-xs text-muted-foreground">({value.sla})</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-5">{value.description}</p>
                      <p className="text-xs text-muted-foreground pl-5 italic">Examples: {value.examples}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

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
                        <SelectItem value="critical">🔴 P1 - Critical</SelectItem>
                        <SelectItem value="high">🟠 P2 - High</SelectItem>
                        <SelectItem value="medium">🟡 P3 - Medium</SelectItem>
                        <SelectItem value="low">🟢 P4 - Low</SelectItem>
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
