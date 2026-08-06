-- Tighten permissions on security definer function
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
-- We need authenticated to be able to execute it for RLS policies to work,
-- but the linter warns about it. This is a common pattern for role-based RLS.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
