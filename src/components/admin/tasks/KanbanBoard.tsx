import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import type { AdminTask, TaskStatus, UpdateTaskData } from "@/hooks/useAdminTasks";

interface KanbanBoardProps {
  tasks: AdminTask[];
  onEditTask: (task: AdminTask) => void;
  onDeleteTask: (taskId: string) => void;
  onLogTime: (task: AdminTask) => void;
  onUpdateTask: (data: UpdateTaskData) => void;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

export const KanbanBoard = ({ 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  onLogTime,
  onUpdateTask 
}: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<AdminTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: AdminTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onUpdateTask({ id: draggedTask.id, status: columnId });
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card className={`h-full transition-colors ${isDragOver ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.color}`} />
                    {column.title}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-2 p-1">
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                      >
                        <TaskCard
                          task={task}
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                          onLogTime={onLogTime}
                          isDragging={draggedTask?.id === task.id}
                        />
                      </div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
