import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import icon from '../../../imagenes/kristelldent-icon.png';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      const isAdmin = user.role === 'admin_global' || user.role === 'admin_sede';
      navigate(isAdmin ? '/admin' : '/profesional');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-[280px] flex-col justify-between gap-14 bg-brand-600 p-8 text-white lg:min-h-[620px] lg:p-[56px_48px]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/18 p-1">
              <img src={icon} alt="" className="h-full w-full" />
            </span>
            <span className="text-base font-semibold">KristellDent</span>
          </div>

          <div className="flex max-w-[30ch] flex-col gap-4">
            <h2 className="text-[32px] font-semibold leading-[1.25] tracking-[-0.02em]">Área interna de la clínica</h2>
            <p className="text-[15px] leading-[1.65]" style={{ color: 'rgba(255,255,255,0.86)' }}>
              Acceso reservado a administradores y profesionales. Los pacientes reservan sin cuenta desde el área
              pública.
            </p>
          </div>

          <Button
            to="/"
            variant="admin-outline"
            size="sm"
            icon={<ArrowLeft size={16} />}
            className="w-fit !border-white/32 !bg-transparent !text-white hover:!bg-white/10"
          >
            Ir al área pública
          </Button>
        </div>

        <div className="flex items-center justify-center bg-white p-8 lg:p-[56px_48px]">
          <form onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-[26px]">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-adm-ink-700">Iniciar sesión</h1>
              <p className="text-sm text-adm-ink-400">Introduce tus credenciales de trabajador.</p>
            </div>

            {error && (
              <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-4">
              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                variant="admin"
                placeholder="nombre@kristelldent.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                label="Contraseña"
                name="password"
                type="password"
                variant="admin"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-adm-ink-500">
                <input type="checkbox" className="h-[15px] w-[15px] accent-brand-600" />
                Recordarme
              </label>
              <Link to="/login/recuperar" className="text-[13px] font-medium text-adm-accent-deep hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" variant="admin-solid" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
