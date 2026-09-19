// Edge Function: lookup-appointments-by-dni
//
// Única vía pública para que un paciente (sin cuenta) consulte SUS propias
// citas por DNI. patients/appointments no tienen policy de SELECT para
// `anon` a propósito (evita que cualquiera pueda leer datos de otro
// paciente con una consulta REST directa) — esta función sí puede leer con
// service_role, pero solo devuelve lo asociado a ese DNI exacto, nunca una
// lista completa ni datos de otros pacientes.
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  let payload: { dni?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const dni = payload.dni?.trim();

  if (!dni || !/^\d{8}$/.test(dni)) {
    return jsonResponse({ error: 'El DNI debe tener 8 dígitos.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');

  if (!serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: patient, error: patientError } = await adminClient
    .from('patients')
    .select('id, dni, first_name, last_name, email, phone')
    .eq('dni', dni)
    .maybeSingle();

  if (patientError) {
    return jsonResponse({ error: patientError.message }, 500);
  }

  if (!patient) {
    return jsonResponse({ patient: null, appointments: [] }, 200);
  }

  const { data: appointments, error: appointmentsError } = await adminClient
    .from('appointments')
    .select('id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason')
    .eq('patient_id', patient.id)
    .order('appointment_date', { ascending: false });

  if (appointmentsError) {
    return jsonResponse({ error: appointmentsError.message }, 500);
  }

  return jsonResponse(
    {
      patient: {
        id: patient.id,
        dni: patient.dni,
        firstName: patient.first_name,
        lastName: patient.last_name,
        email: patient.email,
        phone: patient.phone,
      },
      appointments: (appointments ?? []).map((row) => ({
        id: row.id,
        professionalId: row.professional_id,
        branchId: row.branch_id,
        serviceId: row.service_id,
        date: row.appointment_date,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        reason: row.reason,
      })),
    },
    200,
  );
});
