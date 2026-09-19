-- Corrección: la Edge Function create-public-appointment llama a
-- get_available_slots usando service_role (para revalidar el horario antes
-- de insertar), pero solo se había otorgado EXECUTE a anon/authenticated.
grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to service_role;
