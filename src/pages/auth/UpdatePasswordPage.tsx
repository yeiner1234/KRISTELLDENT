import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import {
  clearPasswordRecoveryFlow,
  isPasswordRecoveryExpired,
  supabase,
  waitForPasswordRecoveryFlow,
} from '../../lib/supabase';
import { getCurrentUser } from '../../services/authService';
import { isValidPassword } from '../../utils/validation';
import icon from '../../../imagenes/kristelldent-icon.png';

function describeUpdatePasswordError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('at least') || normalized.includes('characters') || normalized.includes('short'))) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (normalized.includes('different from the old')) {
    return 'La nueva contraseña debe ser distinta de la anterior.';
  }
  if (normalized.includes('session') || normalized.includes('jwt') || normalized.includes('expired')) {
    return 'El enlace expiró. Solicita uno nuevo.';
  }

  return 'No se pudo actualizar la contraseña. Inténtalo de nuevo.';
}

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      const isRecoveryFlow = await waitForPasswordRecoveryFlow();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      let isValidRecovery = session !== null && isRecoveryFlow;

      if (isValidRecovery && isPasswordRecoveryExpired(session?.user.recovery_sent_at)) {
        isValidRecovery = false;
        clearPasswordRecoveryFlow();
        await supabase.auth.signOut();
      }

      if (isMounted) {
        setHasSession(isValidRecovery);
        setIsCheckingSession(false);
      }
    };

    void checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      // The page may have stayed open past the link's lifetime.
      const { data } = await supabase.auth.getSession();
      if (!data.session || isPasswordRecoveryExpired(data.session.user.recovery_sent_at)) {
        clearPasswordRecoveryFlow();
        await supabase.auth.signOut();
        throw new Error('El enlace expiró. Solicita uno nuevo.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw new Error(describeUpdatePasswordError(updateError.message));
      }

      clearPasswordRecoveryFlow();

      const user = await getCurrentUser();
      const isAdmin = user?.role === 'admin_global' || user?.role === 'admin_sede';
      navigate(isAdmin ? '/admin' : user ? '/profesional' : '/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="flex w-full max-w-[380px] flex-col gap-[26px]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-brand-50 p-1.5">
            <img src={icon} alt="" className="h-full w-full" />
          </span>
          <span className="text-base font-semibold text-adm-ink-700">KristellDent</span>
        </div>

        {isCheckingSession ? (
          <div className="flex justify-center py-10">
            <Spinner size={28} />
          </div>
        ) : !hasSession ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <KeyRound size={22} className="text-adm-ink-300" />
            <p className="text-sm text-adm-ink-400">
              Este enlace ya expiró o no es válido. Solicita uno nuevo desde{' '}
              <a href="/login/recuperar" className="font-medium text-adm-accent-deep hover:underline">
                recuperar contraseña
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-adm-ink-700">Define tu contraseña</h1>
              <p className="text-sm text-adm-ink-400">Esta será tu contraseña para ingresar al panel interno.</p>
            </div>

            {error && (
              <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
                {error}
              </p>
            )}

            <Input
              label="Nueva contraseña"
              name="password"
              type="password"
              variant="admin"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              variant="admin"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            <Button type="submit" variant="admin-solid" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar y entrar'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default UpdatePasswordPage;
