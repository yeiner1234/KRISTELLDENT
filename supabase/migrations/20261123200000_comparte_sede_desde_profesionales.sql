-- =============================================================================
-- shares_branch_with(): la sede de la profesional se lee también de
-- Profesionales
-- =============================================================================
-- sync_professional_branch_access (20261123100000) solo copia a Equipo las
-- sedes de especialista y odontologa_general. Una admin_sede que además
-- atiende (ANali: administra Bagua, atiende en Jaén) quedaba fuera: el admin
-- de Jaén no podía ver su nombre ni guardar su horario ("No tienes permiso
-- para modificar esta sede").
--
-- Copiarla a Equipo en Jaén no sirve: user_branch_access de una admin_sede
-- es lo que la hace administrar esa sede.
--
-- Ahora, para el lado de la persona revisada (target), cuenta tanto Equipo
-- como Profesionales. El lado de quien pregunta (auth.uid()) sigue siendo
-- solo Equipo: atender en una sede no da permisos sobre esa sede.
--
-- Afecta todas las políticas que usan shares_branch_with (profiles,
-- professionals, professional_branches, professional_schedules,
-- professional_services, professional_specialties, schedule_exceptions,
-- user_branch_access). Las de horarios siguen exigiendo además
-- has_branch_access(branch_id).
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create or replace function public.shares_branch_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_branch_access self_access
    where self_access.user_id = auth.uid()
      and (
        exists (
          select 1 from public.user_branch_access target_access
          where target_access.user_id = target_user_id
            and target_access.branch_id = self_access.branch_id
        )
        or exists (
          select 1 from public.professional_branches target_pb
          where target_pb.professional_id = target_user_id
            and target_pb.branch_id = self_access.branch_id
        )
      )
  );
$$;

revoke all on function public.shares_branch_with(uuid) from public;
grant execute on function public.shares_branch_with(uuid) to authenticated;
