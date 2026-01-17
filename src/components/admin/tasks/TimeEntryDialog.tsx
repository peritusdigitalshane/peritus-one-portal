import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useTaskTimeEntries, type AdminTask } from "@/hooks/useAdminTasks";

const formSchema = z.object({
  hours: z.string().min(1, "Hours is required"),
  description: z.string().optional(),
  logged_at: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: AdminTask | null;
}

export const TimeEntryDialog = ({ open, onOpenChange, task }: TimeEntryDialogProps) => {
  const { timeEntries, isLoading, addTimeEntry, deleteTimeEntry } = useTaskTimeEntries(task?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hours: "",
      description: "",
      logged_at: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await addTimeEntry.mutateAsync({
        task_id: task.id,
        hours: parseFloat(data.hours),
        description: data.description || undefined,
        logged_at: data.logged_at,
      });
      form.reset({
        hours: "",
        description: "",
        logged_at: format(new Date(), 'yyyy-MM-dd'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    await deleteTimeEntry.mutateAsync(entryId);
  };

  const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Time - {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total Logged</span>
            <span className="font-semibold">
              {totalHours.toFixed(1)}h
              {task.estimated_hours && (
                <span className="text-muted-foreground font-normal">
                  {' '}/ {task.estimated_hours}h estimated
                </span>
              )}
            </span>
          </div>

          {/* Add Time Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0.25" placeholder="1.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logged_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you work on?" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Log Time
              </Button>
            </form>
          </Form>

          {/* Time Entries List */}
          {timeEntries.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Time Entries</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    timeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{Number(entry.hours).toFixed(1)}h</span>
                            <span className="text-muted-foreground">
                              {format(new Date(entry.logged_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-muted-foreground truncate">{entry.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
