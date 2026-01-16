-- Drop existing ticket policies that allow all users
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;

-- Create new policies that require support_user role
CREATE POLICY "Support users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND has_role(auth.uid(), 'support_user'::app_role)
);

CREATE POLICY "Support users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND has_role(auth.uid(), 'support_user'::app_role)
);

CREATE POLICY "Support users can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND has_role(auth.uid(), 'support_user'::app_role)
);

-- Update ticket_comments policies for support users
DROP POLICY IF EXISTS "Users can add comments to their tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can view comments on their tickets" ON public.ticket_comments;

CREATE POLICY "Support users can add comments to their tickets" 
ON public.ticket_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND is_internal = false 
  AND has_role(auth.uid(), 'support_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM support_tickets t 
    WHERE t.id = ticket_comments.ticket_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Support users can view comments on their tickets" 
ON public.ticket_comments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'support_user'::app_role)
  AND is_internal = false 
  AND EXISTS (
    SELECT 1 FROM support_tickets t 
    WHERE t.id = ticket_comments.ticket_id 
    AND t.user_id = auth.uid()
  )
);