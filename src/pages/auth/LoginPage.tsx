import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { homePathForRole } from '../../utils/roleHome';
import { getRememberMe, setRememberMe } from '../../utils/authStorage';
import background from '../../assets/images/login-fondo.jpg';
import logo from '../../../imagenes/kristelldent-logo.png';
import '../../styles/login.css';

const POPPINS_ID = 'kd-font-poppins';
const POPPINS_HREF = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';

// Poppins solo se usa en esta pantalla: se carga al abrirla.
function usePoppinsFont() {
  useEffect(() => {
    if (document.getElementById(POPPINS_ID)) return;
    const link = document.createElement('link');
    link.id = POPPINS_ID;
    link.rel = 'stylesheet';
    link.href = POPPINS_HREF;
    document.head.appendChild(link);
  }, []);
}

function LogoBadge() {
  return (
    <span className="login__logo">
      <img src={logo} alt="" />
      {/* Curva rosa calcada de la imagen del diseño. */}
      <svg viewBox="0 0 127 17" aria-hidden="true">
        <path d="M3 12.5Q2 12 3 11Q4 10 7 8Q10 6 13 5Q16 4 19 3Q22 2 26.5 2Q31 2 35.5 2Q40 2 44.5 2.5Q49 3 53.5 4Q58 5 62.5 6Q67 7 71.5 7.5Q76 8 80.5 8Q85 8 89.5 8Q94 8 98.5 7.5Q103 7 107.5 6Q112 5 115 4.5Q118 4 121 3.5Q124 3 124.75 3.25Q125.5 3.5 124.75 3.75Q124 4 121 5.5Q118 7 115 8.5Q112 10 107.5 11Q103 12 98.5 13Q94 14 89.5 14.5Q85 15 80.5 15Q76 15 71.5 14.5Q67 14 62.5 13.5Q58 13 53.5 12Q49 11 44.5 10Q40 9 35.5 8.5Q31 8 26.5 8Q22 8 19 8.5Q16 9 13 10Q10 11 7 12Q4 13 3 12.5Z" fill="#e3177c" />
      </svg>
    </span>
  );
}

function LoginPage() {
  usePoppinsFont();
  const navigate = useNavigate();
  const { login, sessionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    setRememberMe(checked);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      navigate(homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const message = error ?? sessionError;

  return (
    <main className="login">
      <img src={background} alt="" className="login__backdrop" />
      <div className="login__veil" />

      <div className="login__stage">
        <img src={background} alt="" className="login__art" />

        <Link to="/" className="login__back">
          <ArrowLeft strokeWidth={2.25} aria-hidden="true" />
          Ir al área pública
        </Link>

        <header className="login__mobile-head">
          <LogoBadge />
          <p className="login__system">
            Sistema Interno <strong>de la Clínica</strong>
          </p>
        </header>

        <section className="login__card" aria-labelledby="login-title">
          <LogoBadge />
          <h1 id="login-title" className="login__title">
            Iniciar sesión
          </h1>
          <p className="login__subtitle">Accede con tus credenciales de trabajador.</p>

          <form onSubmit={handleSubmit} className="login__form">
            <label htmlFor="login-email" className="login__label">
              <span className="login__icon login__icon--mail" aria-hidden="true">
                <Mail strokeWidth={2} />
                <Mail strokeWidth={2} />
              </span>
              Correo electrónico
            </label>
            <div className="login__field">
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                className="login__input"
                placeholder="nombre@kristelldent.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <label htmlFor="login-password" className="login__label">
              <Lock className="login__icon login__icon--lock" strokeWidth={2.5} aria-hidden="true" />
              Contraseña
            </label>
            <div className="login__field">
              <input
                id="login-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                className="login__input login__input--password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login__eye"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={isPasswordVisible}
                aria-controls="login-password"
                title={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {/* Como en el diseño: ojo tachado mientras la contraseña está oculta. */}
                {isPasswordVisible ? (
                  <Eye strokeWidth={2} aria-hidden="true" />
                ) : (
                  <EyeOff strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="login__row">
              <label className="login__remember">
                <input
                  type="checkbox"
                  className="login__checkbox"
                  checked={remember}
                  onChange={(event) => handleRememberChange(event.target.checked)}
                />
                Recordarme
              </label>
              <Link to="/login/recuperar" className="login__forgot">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" className="login__submit" disabled={isSubmitting}>
              <LogIn strokeWidth={2.75} aria-hidden="true" />
              {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>

            {message && (
              <p role="alert" className="login__error">
                {message}
              </p>
            )}

            <p className="login__tagline">
              Tu trabajo hace <strong>sonreír a más personas</strong>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
