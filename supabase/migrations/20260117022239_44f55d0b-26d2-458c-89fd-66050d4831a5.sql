-- Create subtasks table
CREATE TABLE public.admin_task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policy for super admins
CREATE POLICY "Super admins can manage subtasks"
ON public.admin_task_subtasks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));