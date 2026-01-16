-- Expand end-user ticket access to support_user OR admin OR super_admin

DROP POLICY IF EXISTS "Support users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Support users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Support users can update their own tickets" ON public.support_tickets;

CREATE POLICY "Eligible users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'support_user'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Eligible users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'support_user'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Eligible users can update their own tickets"
ON public.support_tickets
FOR UPDATE
USING (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'support_user'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- ticket_comments: eligible users can view/add (public) comments on their own tickets
DROP POLICY IF EXISTS "Support users can add comments to their tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Support users can view comments on their tickets" ON public.ticket_comments;

CREATE POLICY "Eligible users can add comments to their tickets"
ON public.ticket_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_internal = false
  AND (
    has_role(auth.uid(), 'support_user'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Eligible users can view comments on their tickets"
ON public.ticket_comments
FOR SELECT
USING (
  is_internal = false
  AND (
    has_role(auth.uid(), 'support_user'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND t.user_id = auth.uid()
  )
);