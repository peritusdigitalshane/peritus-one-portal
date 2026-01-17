import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Timer, Clock, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { AdminTask, TaskPriority, TaskStatus } from "@/hooks/useAdminTasks";

interface TaskListViewProps {
  tasks: AdminTask[];
  onEditTask: (task: AdminTask) => void;
  onDeleteTask: (taskId: string) => void;
  onLogTime: (task: AdminTask) => void;
}

const statusColors: Record<TaskStatus, string> = {
  backlog: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  todo: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  review: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  done: "bg-green-500/10 text-green-600 border-green-500/20",
};

const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TaskListView = ({ tasks, onEditTask, onDeleteTask, onLogTime }: TaskListViewProps) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[task.status]}>
                      {statusLabels[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {priorityLabels[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.assigned_profile ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {task.assigned_profile.full_name || task.assigned_profile.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : ''}`}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-sm">{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No due date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {(task.total_hours || 0).toFixed(1)}h
                        {task.estimated_hours && ` / ${task.estimated_hours}h`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditTask(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onLogTime(task)}
                      >
                        <Timer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
