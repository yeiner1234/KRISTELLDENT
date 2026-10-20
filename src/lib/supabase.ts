import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PASSWORD_RECOVERY_KEY = 'kd_password_recovery';

/** Vigencia máxima del enlace de recuperación, contada desde su envío. */
export const PASSWORD_RECOVERY_TTL_MS = 30 * 60 * 1000;

// Registered at module level: Supabase emits PASSWORD_RECOVERY while the client
// initializes from the email link, before any component mounts.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    try { sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1'); } catch { /* storage no disponible */ }
  }
});

export function isPasswordRecoveryFlow(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
}

// Read before the client cleans the URL: the email link lands with `#...&type=recovery`.
const urlLooksLikeRecovery =
  typeof window !== 'undefined' && /(^#|&)type=recovery(&|$)/.test(window.location.hash);

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
