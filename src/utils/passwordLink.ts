// Enlaces del correo que llevan a /actualizar-contrasena:
//   - recovery: "Recuperar contraseña" (#...&type=recovery).
//   - invite: invitación del personal desde Equipo (#...&type=invite).
// Un enlace vencido llega con #error=...&error_code=otp_expired y sin type.
export type PasswordLinkFlow = 'recovery' | 'invite';

export function passwordFlowFromHash(hash: string): PasswordLinkFlow | null {
  const type = new URLSearchParams(hash.replace(/^#/, '')).get('type');
  return type === 'recovery' || type === 'invite' ? type : null;
}
