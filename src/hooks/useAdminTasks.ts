import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  estimated_hours: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assigned_profile?: {
    full_name: string | null;
    email: string | null;
  };
  total_hours?: number;
  subtask_count?: number;
  completed_subtask_count?: number;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
  completed_at: string | null;
  assigned_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
}

export interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  sort_order?: number;
}

export interface CreateTimeEntryData {
  task_id: string;
  hours: number;
  description?: string;
  logged_at?: string;
}

export const useAdminTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('admin_tasks')
        .select(`
          *,
          assigned_profile:profiles!admin_tasks_assigned_to_fkey(full_name, email)
        `)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get time entries for all tasks
      const taskIds = data?.map(t => t.id) || [];
      const { data: timeEntries } = await supabase
        .from('task_time_entries')
        .select('task_id, hours')
        .in('task_id', taskIds);

      // Get subtask counts
      const { data: subtasks } = await supabase
        .from('admin_task_subtasks')
        .select('task_id, is_completed')
        .in('task_id', taskIds);

      // Calculate total hours per task
      const hoursMap: Record<string, number> = {};
      timeEntries?.forEach(entry => {
        hoursMap[entry.task_id] = (hoursMap[entry.task_id] || 0) + Number(entry.hours);
      });

      // Calculate subtask counts
      const subtaskCountMap: Record<string, { total: number; completed: number }> = {};
      subtasks?.forEach(st => {
        if (!subtaskCountMap[st.task_id]) {
          subtaskCountMap[st.task_id] = { total: 0, completed: 0 };
        }
        subtaskCountMap[st.task_id].total++;
        if (st.is_completed) {
          subtaskCountMap[st.task_id].completed++;
        }
      });

      return (data || []).map(task => ({
        ...task,
        total_hours: hoursMap[task.id] || 0,
        subtask_count: subtaskCountMap[task.id]?.total || 0,
        completed_subtask_count: subtaskCountMap[task.id]?.completed || 0,
      })) as AdminTask[];
    },
  });

  const { data: superAdmins = [] } = useQuery({
    queryKey: ['super-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');

      if (error) throw error;

      const userIds = data?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      return profiles || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('admin_tasks')
        .insert({
          ...taskData,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send SMS if task is assigned to someone
      if (taskData.assigned_to) {
        try {
          await supabase.functions.invoke('send-assignment-sms', {
            body: {
              type: 'task',
              assignedToUserId: taskData.assigned_to,
              title: data.title,
              priority: taskData.priority || 'medium',
            },
          });
        } catch (smsError) {
          console.error('Failed to send assignment SMS:', smsError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTaskData) => {
      // Get original task to check if assignment changed
      const { data: originalTask } = await supabase
        .from('admin_tasks')
        .select('assigned_to, title, priority')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('admin_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send SMS if assigned_to changed to a new user
      if (updates.assigned_to && updates.assigned_to !== originalTask?.assigned_to) {
        try {
          await supabase.functions.invoke('send-assignment-sms', {
            body: {
              type: 'task',
              assignedToUserId: updates.assigned_to,
              title: data.title,
              priority: data.priority,
            },
          });
        } catch (smsError) {
          console.error('Failed to send assignment SMS:', smsError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('admin_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    },
  });

  return {
    tasks,
    isLoading,
    superAdmins,
    createTask,
    updateTask,
    deleteTask,
  };
};

export const useTaskTimeEntries = (taskId: string) => {
  const queryClient = useQueryClient();

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['task-time-entries', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('logged_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(e => e.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(entry => ({
        ...entry,
        user_profile: profileMap.get(entry.user_id) || undefined,
      })) as TaskTimeEntry[];
    },
    enabled: !!taskId,
  });

  const addTimeEntry = useMutation({
    mutationFn: async (entryData: CreateTimeEntryData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          ...entryData,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Time logged successfully');
    },
    onError: (error) => {
      toast.error('Failed to log time: ' + error.message);
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Time entry deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete time entry: ' + error.message);
    },
  });

  return {
    timeEntries,
    isLoading,
    addTimeEntry,
    deleteTimeEntry,
  };
};

export interface CreateSubtaskData {
  task_id: string;
  title: string;
  assigned_to?: string;
}

export const useTaskSubtasks = (taskId: string) => {
  const queryClient = useQueryClient();

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['task-subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_task_subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch assigned profiles
      const assignedIds = [...new Set(data?.filter(s => s.assigned_to).map(s => s.assigned_to as string) || [])];
      const { data: profiles } = assignedIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name, email').in('id', assignedIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));

      return (data || []).map(subtask => ({
        ...subtask,
        assigned_profile: subtask.assigned_to ? profileMap.get(subtask.assigned_to) : undefined,
      })) as TaskSubtask[];
    },
    enabled: !!taskId,
  });

  const addSubtask = useMutation({
    mutationFn: async (subtaskData: CreateSubtaskData) => {
      const { data, error } = await supabase
        .from('admin_task_subtasks')
        .insert(subtaskData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error) => {
      toast.error('Failed to add subtask: ' + error.message);
    },
  });

  const toggleSubtask = useMutation({
    mutationFn: async ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) => {
      const { data, error } = await supabase
        .from('admin_task_subtasks')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', subtaskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error) => {
      toast.error('Failed to update subtask: ' + error.message);
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from('admin_task_subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error) => {
      toast.error('Failed to delete subtask: ' + error.message);
    },
  });

  const updateSubtaskAssignee = useMutation({
    mutationFn: async ({ subtaskId, assignedTo }: { subtaskId: string; assignedTo: string | null }) => {
      const { data, error } = await supabase
        .from('admin_task_subtasks')
        .update({ assigned_to: assignedTo })
        .eq('id', subtaskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] });
    },
    onError: (error) => {
      toast.error('Failed to update assignee: ' + error.message);
    },
  });

  return {
    subtasks,
    isLoading,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtaskAssignee,
  };
};
