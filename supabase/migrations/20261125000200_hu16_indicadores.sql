-- =============================================================================
-- HU16: panel de indicadores de citas.
--
-- appointment_indicators cuenta las citas del periodo agrupadas por sede,
-- profesional y estado, y separa las pendientes o confirmadas cuya hora de
-- fin ya pasó (hora de Lima): esas son las "no asistidas".
--
-- SECURITY INVOKER: aplica la RLS de quien llama. El admin_sede solo cuenta
-- citas de su sede aunque pida otra (caso límite 1); el admin_global, todas
-- (criterio 3). Se cuenta en la base y no en el navegador porque PostgREST
-- corta las consultas en 1000 filas y la HU pide 3000 citas al mes.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create or replace function public.appointment_indicators(
  p_from date,
  p_to date,
  p_professional_id uuid default null,
  p_branch_id uuid default null
)
returns table (
  branch_id uuid,
  professional_id uuid,
  status public.appointment_status,
  is_past boolean,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.branch_id,
    a.professional_id,
    a.status,
    (a.appointment_date + a.end_time) < (now() at time zone 'America/Lima') as is_past,
    count(*) as total
  from public.appointments a
  where a.appointment_date between p_from and p_to
    and (p_professional_id is null or a.professional_id = p_professional_id)
    and (p_branch_id is null or a.branch_id = p_branch_id)
  group by 1, 2, 3, 4;
$$;

revoke all on function public.appointment_indicators(date, date, uuid, uuid) from public, anon;
grant execute on function public.appointment_indicators(date, date, uuid, uuid) to authenticated;

create index if not exists idx_appointments_date_branch
  on public.appointments (appointment_date, branch_id);

-- =============================================================================
-- COMPROBACIÓN (caso límite 1), en el SQL Editor:
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub": "<id de un admin_sede>", "role": "authenticated"}';
--   select * from public.appointment_indicators('2026-11-01', '2026-11-30', null, '<id de OTRA sede>');
--   -- 0 filas.
--   rollback;
-- Con el id de un admin_global devuelve las citas de esa sede.
-- =============================================================================
