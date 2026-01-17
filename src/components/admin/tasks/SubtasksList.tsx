import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, User, Loader2 } from "lucide-react";
import { useTaskSubtasks, type TaskSubtask } from "@/hooks/useAdminTasks";

interface SubtasksListProps {
  taskId: string;
  superAdmins: { id: string; full_name: string | null; email: string | null }[];
}

export const SubtasksList = ({ taskId, superAdmins }: SubtasksListProps) => {
  const { subtasks, isLoading, addSubtask, toggleSubtask, deleteSubtask, updateSubtaskAssignee } = useTaskSubtasks(taskId);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setIsAdding(true);
    try {
      await addSubtask.mutateAsync({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
      });
      setNewSubtaskTitle("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleToggle = async (subtask: TaskSubtask) => {
    await toggleSubtask.mutateAsync({
      subtaskId: subtask.id,
      isCompleted: !subtask.is_completed,
    });
  };

  const handleAssigneeChange = async (subtaskId: string, value: string) => {
    await updateSubtaskAssignee.mutateAsync({
      subtaskId,
      assignedTo: value === "unassigned" ? null : value,
    });
  };

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Subtasks
          {totalCount > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </h4>
      </div>

      {/* Add Subtask */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button 
          type="button" 
          size="icon" 
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim() || isAdding}
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Subtasks List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : subtasks.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`flex items-center gap-2 p-2 rounded-lg border bg-muted/30 ${
                subtask.is_completed ? 'opacity-60' : ''
              }`}
            >
              <Checkbox
                checked={subtask.is_completed}
                onCheckedChange={() => handleToggle(subtask)}
              />
              <span className={`flex-1 text-sm ${subtask.is_completed ? 'line-through' : ''}`}>
                {subtask.title}
              </span>
              <Select
                value={subtask.assigned_to || "unassigned"}
                onValueChange={(value) => handleAssigneeChange(subtask.id, value)}
              >
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue>
                    {subtask.assigned_profile ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {subtask.assigned_profile.full_name?.split(' ')[0] || 
                         subtask.assigned_profile.email?.split('@')[0]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Assign</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {superAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteSubtask.mutate(subtask.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No subtasks yet
        </p>
      )}
    </div>
  );
};
