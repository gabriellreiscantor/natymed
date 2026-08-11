-- Update profiles to be admins
UPDATE public.profiles 
SET is_admin = true, is_accepted = true 
WHERE email IN ('natyalvesdeoliveira@icloud.com', 'natyalvesdeoliveira@cloud.com', 'ghabriellreis@gmail.com');

-- Ensure they have the admin role in the user_roles table if it exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role 
FROM public.profiles 
WHERE email IN ('natyalvesdeoliveira@icloud.com', 'natyalvesdeoliveira@cloud.com', 'ghabriellreis@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
