// Edge Function: create-internal-user
//
// Invita a una cuenta interna. Una persona = una cuenta: para que una
// profesional atienda en otra sede se le agrega la sede en Profesionales, no
// se le crea otra cuenta. Nunca crea admin_global (403): esa se crea desde
// Supabase (README).
//
// Especialista y odontóloga general se crean con su ficha (professionals) y
// sus sedes en professional_branches; el trigger
// sync_professional_branch_access les da el acceso en user_branch_access.
// Técnicas y administradoras de sede reciben sus sedes en user_branch_access.
// Si algo falla, se borra la cuenta entera: no queda nada a medias.
//
// La validación vive en logic.ts (probada con Vitest).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isProfessionalRole, validateCreateUserRequest, type CreateUserPayload } from './logic.ts';

const EMAIL_TAKEN_MESSAGE =
  'Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Borrar el usuario de Auth borra en cascada profiles, professionals,
// professional_branches y user_branch_access.
async function rollback(adminClient: SupabaseClient, userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error('No se pudo deshacer la cuenta a medias', { userId, error });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'No autenticado.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  // Este proyecto usa el sistema nuevo de claves (publishable/secret), sin
  // claves "legacy" — por eso la privilegiada se define como secreto propio
  // (SB_SECRET_KEY) en vez de depender de SUPABASE_SERVICE_ROLE_KEY.
  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');

  if (!serviceRoleKey) {
    console.error('Falta el secreto SB_SECRET_KEY en esta función.');
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }

  // Cliente "como el llamante": solo sirve para validar su JWT de verdad.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: callerAuthUser },
    error: callerAuthError,
  } = await callerClient.auth.getUser();

  if (callerAuthError || !callerAuthUser) {
    console.error('callerAuthError', callerAuthError);
    return jsonResponse({ error: 'Sesión inválida.' }, 401);
  }

  // Cliente con privilegios de servidor. Se usa SOLO dentro de esta función.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const [{ data: callerProfile, error: callerProfileError }, { data: callerBranches, error: callerBranchesError }] =
    await Promise.all([
      adminClient.from('profiles').select('role, active').eq('id', callerAuthUser.id).maybeSingle(),
      adminClient.from('user_branch_access').select('branch_id').eq('user_id', callerAuthUser.id),
    ]);

  if (callerProfileError || !callerProfile || !callerProfile.active) {
    console.error('callerProfile lookup failed', { callerId: callerAuthUser.id, callerProfileError, callerProfile });
    return jsonResponse({ error: 'Cuenta no autorizada.' }, 403);
  }
  if (callerBranchesError) {
    return jsonResponse({ error: 'No se pudieron verificar tus sedes asignadas.' }, 500);
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const validation = validateCreateUserRequest(payload ?? {}, {
    role: callerProfile.role,
    branchIds: (callerBranches ?? []).map((row) => row.branch_id as string),
  });
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, validation.status);
  }
  const { email, fullName, role, branchIds } = validation.value;

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfileError) {
    return jsonResponse({ error: 'No se pudo verificar el correo.' }, 500);
  }
  if (existingProfile) {
    return jsonResponse({ error: EMAIL_TAKEN_MESSAGE }, 409);
  }

  // Se invita en vez de crear con contraseña: la persona la define ella
  // misma vía el correo que le llega, nadie más la conoce ni la transmite.
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/actualizar-contrasena`,
  });

  if (inviteError || !invited.user) {
    // Auth puede tener el correo aunque no tenga perfil (o con otras mayúsculas).
    if (inviteError?.message?.toLowerCase().includes('already been registered')) {
      return jsonResponse({ error: EMAIL_TAKEN_MESSAGE }, 409);
    }
    return jsonResponse({ error: inviteError?.message ?? 'No se pudo crear la cuenta.' }, 400);
  }

  const newUserId = invited.user.id;

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: newUserId,
    full_name: fullName,
    email,
    role,
    active: true,
  });

  if (profileError) {
    await rollback(adminClient, newUserId);
    return jsonResponse({ error: `No se pudo crear el perfil: ${profileError.message}` }, 500);
  }

  if (isProfessionalRole(role)) {
    const { error: professionalError } = await adminClient.from('professionals').insert({ id: newUserId });
    if (professionalError) {
      await rollback(adminClient, newUserId);
      return jsonResponse({ error: `No se pudo crear la ficha profesional: ${professionalError.message}` }, 500);
    }

    const { error: branchesError } = await adminClient
      .from('professional_branches')
      .insert(branchIds.map((branchId) => ({ professional_id: newUserId, branch_id: branchId })));
    if (branchesError) {
      await rollback(adminClient, newUserId);
      return jsonResponse({ error: `No se pudo asignar la(s) sede(s): ${branchesError.message}` }, 500);
    }
  } else {
    const { error: branchAccessError } = await adminClient
      .from('user_branch_access')
      .insert(branchIds.map((branchId) => ({ user_id: newUserId, branch_id: branchId })));
    if (branchAccessError) {
      await rollback(adminClient, newUserId);
      return jsonResponse({ error: `No se pudo asignar la(s) sede(s): ${branchAccessError.message}` }, 500);
    }
  }

  return jsonResponse({ id: newUserId, email, fullName, role }, 201);
});
