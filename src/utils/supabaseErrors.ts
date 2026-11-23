// Postgres rechaza con "new row violates row-level security policy…" cuando
// el usuario intenta escribir fuera de lo que su rol permite (por ejemplo, un
// admin_sede en otra sede). Sin GRANT sobre la tabla responde "permission
// denied for table …" (42501). Ese texto técnico no se muestra al usuario.
// La restricción professional_schedules_no_overlap rechaza un horario que se
// cruza con el de la misma profesional en otra sede.
export function friendlyWriteError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('professional_schedules_no_overlap')) {
    return 'Ese horario se cruza con su horario en otra sede.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'No tienes permiso para modificar esta sede.';
  }
  return message;
}
