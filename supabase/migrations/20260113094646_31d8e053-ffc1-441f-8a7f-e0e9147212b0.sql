-- Drop and recreate the function to make first user super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  IF user_count = 1 THEN
    -- First user gets super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    -- Other users get regular user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;