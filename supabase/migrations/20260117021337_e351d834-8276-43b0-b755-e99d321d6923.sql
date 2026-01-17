-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create admin_tasks table
CREATE TABLE public.admin_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL,
  due_date DATE,
  estimated_hours NUMERIC(5,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_entries table for time tracking
CREATE TABLE public.task_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_tasks
CREATE POLICY "Super admins can manage tasks"
ON public.admin_tasks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for task_time_entries
CREATE POLICY "Super admins can manage time entries"
ON public.task_time_entries
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_admin_tasks_updated_at
BEFORE UPDATE ON public.admin_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();