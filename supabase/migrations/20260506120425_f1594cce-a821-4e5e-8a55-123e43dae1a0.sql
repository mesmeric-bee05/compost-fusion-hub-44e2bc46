
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) TO authenticated, service_role;
