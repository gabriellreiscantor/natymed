-- Grant usage on the new schema only to relevant roles
REVOKE ALL ON SCHEMA auth_utils FROM PUBLIC;
GRANT USAGE ON SCHEMA auth_utils TO authenticated, service_role;

-- Revoke all on the function and grant only what's necessary
REVOKE ALL ON FUNCTION auth_utils.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_utils.has_role(uuid, app_role) TO authenticated, service_role;
