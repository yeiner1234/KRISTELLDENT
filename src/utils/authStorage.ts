// "Recordarme" del login: con la casilla marcada la sesión de Supabase vive en
// localStorage (sobrevive al cerrar el navegador); desmarcada, en sessionStorage.
export const REMEMBER_ME_KEY = 'kd_remember_me';

type StorageName = 'local' | 'session';

function storageFor(name: StorageName): Storage | null {
  try {
    return name === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setRememberMe(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  } catch {
    /* storage no disponible */
  }
}

// El code-verifier (PKCE) se guarda al pedir el correo y se lee en la pestaña
// que abre el enlace: sessionStorage no se comparte entre pestañas.
function preferredOrder(key: string): [StorageName, StorageName] {
  return key.endsWith('-code-verifier') || getRememberMe() ? ['local', 'session'] : ['session', 'local'];
}

function read(name: StorageName, key: string): string | null {
  try {
    return storageFor(name)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function remove(name: StorageName, key: string): void {
  try {
    storageFor(name)?.removeItem(key);
  } catch {
    /* storage no disponible */
  }
}

export const authStorage = {
  getItem(key: string): string | null {
    const [first, second] = preferredOrder(key);
    return read(first, key) ?? read(second, key);
  },
  setItem(key: string, value: string): void {
    const [target, other] = preferredOrder(key);
    try {
      storageFor(target)?.setItem(key, value);
    } catch {
      /* storage lleno o no disponible */
    }
    remove(other, key);
  },
  removeItem(key: string): void {
    remove('local', key);
    remove('session', key);
  },
};
