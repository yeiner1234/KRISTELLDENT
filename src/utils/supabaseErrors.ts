// Postgres rechaza con "new row violates row-level security policy…" cuando
// el usuario intenta escribir fuera de lo que su rol permite (por ejemplo, un
// admin_sede en otra sede). Ese texto técnico no se muestra al usuario.
export function friendlyWriteError(message: string): string {
  if (message.toLowerCase().includes('row-level security')) {
    return 'No tienes permiso para modificar esta sede.';
  }
  return message;
}
