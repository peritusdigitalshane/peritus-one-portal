-- Allow super admins to update all profiles
CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));