import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/User';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void password;
    login(email, role);
    navigate(role === 'ADMIN' ? '/admin' : '/profesional');
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-brand-700">
          <Stethoscope size={32} />
          <h1 className="text-xl font-bold">Acceso al panel interno</h1>
          <p className="text-center text-sm text-ink-tertiary">Solo para personal administrativo y profesional.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-secondary">Rol</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'ADMIN'}
                  onChange={() => setRole('ADMIN')}
                />
                Administrador
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'PROFESSIONAL'}
                  onChange={() => setRole('PROFESSIONAL')}
                />
                Profesional
              </label>
            </div>
          </div>

          <Button type="submit" className="mt-2 w-full">
            Ingresar
          </Button>
        </form>
      </div>
    </section>
  );
}

export default LoginPage;
