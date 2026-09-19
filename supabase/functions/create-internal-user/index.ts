// Edge Function: create-internal-user
//
// Única vía autorizada para crear personal interno (admin_sede, especialista,
// tecnica) o, si quien llama es admin_global, también otro admin_global.
// Corre en el servidor de Supabase (Deno) — es el único lugar del proyecto
// donde se usa SUPABASE_SERVICE_ROLE_KEY. Esa clave nunca sale de aquí.
//
// Reglas de autorización (ver migración 20260918033456_initial_auth_branches.sql):
//   - admin_global: puede crear cualquier rol, con o sin sedes.
//   - admin_sede: solo puede crear 'especialista' o 'tecnica', y únicamente
//     asignándolos a sedes que él mismo tiene en user_branch_access.
//   - cualquier otro rol (o cuenta inactiva / sin perfil): rechazado.
//
// El rol y las sedes SIEMPRE se deciden aquí, en base al perfil real del
// llamante (consultado con service_role) — nunca a partir de datos que el
// cliente pudiera manipular sin verificación.
import { createClient } from 'jsr:@supabase/supabase-js@2';

type AppRole = 'admin_global' | 'admin_sede' | 'especialista' | 'tecnica';

const ALL_ROLES: AppRole[] = ['admin_global', 'admin_sede', 'especialista', 'tecnica'];
const ROLES_ADMIN_SEDE_CAN_CREATE: AppRole[] = ['especialista', 'tecnica'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  email?: string;
  fullName?: string;
  role?: AppRole;
  branchIds?: string[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', callerAuthUser.id)
    .maybeSingle();

  if (callerProfileError || !callerProfile || !callerProfile.active) {
    console.error('callerProfile lookup failed', {
      callerId: callerAuthUser.id,
      callerProfileError,
      callerProfile,
    });
    return jsonResponse({ error: 'Cuenta no autorizada.' }, 403);
  }

  if (callerProfile.role !== 'admin_global' && callerProfile.role !== 'admin_sede') {
    return jsonResponse({ error: 'No tienes permisos para crear usuarios.' }, 403);
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.fullName?.trim();
  const role = payload.role;
  const branchIds = Array.isArray(payload.branchIds) ? payload.branchIds : [];

  if (!email || !fullName || !role || !ALL_ROLES.includes(role)) {
    return jsonResponse({ error: 'Datos incompletos o rol inválido.' }, 400);
  }

  if (role !== 'admin_global' && branchIds.length === 0) {
    return jsonResponse({ error: 'Debes asignar al menos una sede para este rol.' }, 400);
  }

  if (callerProfile.role === 'admin_sede') {
    if (!ROLES_ADMIN_SEDE_CAN_CREATE.includes(role)) {
      return jsonResponse({ error: 'Un admin de sede solo puede crear especialistas o técnicas.' }, 403);
    }

    const { data: callerBranches, error: callerBranchesError } = await adminClient
      .from('user_branch_access')
      .select('branch_id')
      .eq('user_id', callerAuthUser.id);

    if (callerBranchesError) {
      return jsonResponse({ error: 'No se pudieron verificar tus sedes asignadas.' }, 500);
    }

    const allowedBranchIds = new Set((callerBranches ?? []).map((row) => row.branch_id));
    const hasOutsideAccess = branchIds.some((id) => !allowedBranchIds.has(id));

    if (hasOutsideAccess) {
      return jsonResponse({ error: 'No puedes asignar sedes que no te pertenecen.' }, 403);
    }
  }

  // Se invita en vez de crear con contraseña: la persona la define ella
  // misma vía el correo que le llega, nadie más la conoce ni la transmite.
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/actualizar-contrasena`,
  });

  if (inviteError || !invited.user) {
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
    await adminClient.auth.admin.deleteUser(newUserId);
    return jsonResponse({ error: `No se pudo crear el perfil: ${profileError.message}` }, 500);
  }

  if (branchIds.length > 0) {
    const rows = branchIds.map((branchId) => ({ user_id: newUserId, branch_id: branchId }));
    const { error: branchAccessError } = await adminClient.from('user_branch_access').insert(rows);

    if (branchAccessError) {
      await adminClient.from('profiles').delete().eq('id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: `No se pudo asignar la(s) sede(s): ${branchAccessError.message}` }, 500);
    }
  }

  return jsonResponse({ id: newUserId, email, fullName, role }, 201);
});
