UPDATE public.profiles 
SET is_admin = true, is_accepted = true 
WHERE email = 'ghabriellreis@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE email = 'ghabriellreis@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;