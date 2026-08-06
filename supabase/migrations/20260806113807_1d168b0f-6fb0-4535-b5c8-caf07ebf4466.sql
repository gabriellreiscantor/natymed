-- Move has_role to a private schema to avoid execution by public/authenticated directly via API
CREATE SCHEMA IF NOT EXISTS auth_utils;
ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA auth_utils;

-- Update RLS policies to use the new schema
DROP POLICY "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth_utils.has_role(auth.uid(), 'admin'));
