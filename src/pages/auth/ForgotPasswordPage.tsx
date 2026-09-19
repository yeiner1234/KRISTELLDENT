import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { requestPasswordReset } from '../../services/authService';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-[380px] flex-col gap-[26px]">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-adm-ink-400 hover:text-adm-ink-700">
          <ArrowLeft size={16} />
          Volver a iniciar sesión
        </Link>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-adm-status-confirmed-bg text-adm-status-confirmed-text">
              <MailCheck size={20} />
            </span>
            <h1 className="text-[22px] font-semibold text-adm-ink-700">Revisa tu correo</h1>
            <p className="text-sm text-adm-ink-400">
              Si <strong>{email}</strong> está registrado, te enviamos un enlace para restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-adm-ink-700">Recuperar contraseña</h1>
              <p className="text-sm text-adm-ink-400">Te enviaremos un enlace a tu correo de trabajo para restablecerla.</p>
            </div>

            {error && (
              <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
                {error}
              </p>
            )}

            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              variant="admin"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button type="submit" variant="admin-solid" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default ForgotPasswordPage;
