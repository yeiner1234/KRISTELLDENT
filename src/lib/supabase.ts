import { createClient } from '@supabase/supabase-js';
import { passwordFlowFromHash, type PasswordLinkFlow } from '../utils/passwordLink';
import { authStorage } from '../utils/authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.',
  );
}

// La sesión va a localStorage o sessionStorage según "Recordarme" del login.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
});

// Guarda qué enlace abrió /actualizar-contrasena: 'recovery' o 'invite'.
const PASSWORD_RECOVERY_KEY = 'kd_password_recovery';

/** Vigencia máxima del enlace de recuperación, contada desde su envío. */
export const PASSWORD_RECOVERY_TTL_MS = 30 * 60 * 1000;

// Registered at module level: Supabase emits PASSWORD_RECOVERY while the client
// initializes from the email link, before any component mounts.
function rememberPasswordFlow(flow: PasswordLinkFlow): void {
  try { sessionStorage.setItem(PASSWORD_RECOVERY_KEY, flow); } catch { /* storage no disponible */ }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    rememberPasswordFlow('recovery');
  }
});

export function getPasswordLinkFlow(): PasswordLinkFlow | null {
  try {
    const value = sessionStorage.getItem(PASSWORD_RECOVERY_KEY);
    // '1' = valor que guardaban las versiones anteriores para recovery.
    if (value === 'recovery' || value === '1') return 'recovery';
    if (value === 'invite') return 'invite';
    return null;
  } catch {
    return null;
  }
}

export function isPasswordRecoveryFlow(): boolean {
  return getPasswordLinkFlow() !== null;
}

// Read before the client cleans the URL: the email link lands with
// `#...&type=recovery` (recuperar contraseña) or `#...&type=invite`
// (invitación del personal). Supabase does not emit PASSWORD_RECOVERY for an
// invitation, so that flow is remembered here. If the invitation token is
// invalid or expired, Supabase creates no session and the page says so.
const urlFlow = typeof window !== 'undefined' ? passwordFlowFromHash(window.location.hash) : null;
const urlLooksLikeRecovery = urlFlow === 'recovery';
if (urlFlow === 'invite') {
  rememberPasswordFlow('invite');
}

/**
 * Supabase emits PASSWORD_RECOVERY in a setTimeout after initializing, so
 * getSession() can resolve before it. When the page was opened from the email
 * link, wait for that event instead of reading the flag too early.
 */
export function waitForPasswordRecoveryFlow(timeoutMs = 5000): Promise<boolean> {
  if (isPasswordRecoveryFlow() || !urlLooksLikeRecovery) {
    return Promise.resolve(isPasswordRecoveryFlow());
  }

  return new Promise((resolve) => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      if (isPasswordRecoveryFlow()) {
        finish();
      }
    });
    const timer = setTimeout(finish, timeoutMs);

    function finish() {
      clearTimeout(timer);
      data.subscription.unsubscribe();
      resolve(isPasswordRecoveryFlow());
    }
  });
}

export function clearPasswordRecoveryFlow(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
  } catch {
    /* storage no disponible */
  }
}

export function isPasswordRecoveryExpired(recoverySentAt: string | undefined): boolean {
  if (!recoverySentAt) {
    return true;
  }
  const sentAt = new Date(recoverySentAt).getTime();
  return Number.isNaN(sentAt) || Date.now() - sentAt > PASSWORD_RECOVERY_TTL_MS;
}
