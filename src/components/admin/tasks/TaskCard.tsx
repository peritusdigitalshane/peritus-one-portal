import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Calendar, 
  User, 
  MoreVertical,
  Pencil,
  Trash2,
  Timer
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import type { AdminTask, TaskPriority, TaskStatus } from "@/hooks/useAdminTasks";

interface TaskCardProps {
  task: AdminTask;
  onEdit: (task: AdminTask) => void;
  onDelete: (taskId: string) => void;
  onLogTime: (task: AdminTask) => void;
  isDragging?: boolean;
}

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

export const TaskCard = ({ task, onEdit, onDelete, onLogTime, isDragging }: TaskCardProps) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverdue ? 'border-destructive/50' : ''}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-tight flex-1">{task.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLogTime(task)}>
                <Timer className="h-4 w-4 mr-2" />
                Log Time
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
          {(task.total_hours !== undefined && task.total_hours > 0) && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.total_hours.toFixed(1)}h
              {task.estimated_hours && ` / ${task.estimated_hours}h`}
            </div>
          )}
          {task.assigned_profile && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_profile.full_name?.split(' ')[0] || task.assigned_profile.email?.split('@')[0]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
