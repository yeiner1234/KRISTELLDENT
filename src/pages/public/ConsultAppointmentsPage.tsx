import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import FormError from '../../components/common/FormError';
import { getPatientAppointments, requestAppointmentCodes } from '../../services/appointmentService';
import { isValidDni } from '../../utils/validation';

interface FieldErrors {
  dni?: string;
  code?: string;
}

function ConsultAppointmentsPage() {
  const navigate = useNavigate();
  const [dni, setDni] = useState('');
  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isResendOpen, setIsResendOpen] = useState(false);
  const [resendDni, setResendDni] = useState('');
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedDni = dni.trim();
    const trimmedCode = code.trim();
    const errors: FieldErrors = {};
    if (!isValidDni(trimmedDni)) errors.dni = 'Ingresa un DNI válido de 8 dígitos.';
    if (!trimmedCode) errors.code = 'Ingresa el código de tu cita (por ejemplo KD-ABC234).';
    setFieldErrors(errors);
    setError(null);
    if (errors.dni || errors.code) return;

    setIsSubmitting(true);
    try {
      // Se valida aquí para mostrar el error en el formulario; /mis-citas
      // vuelve a pedir la lista con el mismo DNI y código.
      await getPatientAppointments(trimmedDni, trimmedCode);
      navigate('/mis-citas', { state: { dni: trimmedDni, code: trimmedCode } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron consultar tus citas.');
      setIsSubmitting(false);
    }
  };

  const openResend = () => {
    setIsResendOpen(true);
    setResendDni(dni.trim());
    setResendError(null);
    setResendMessage(null);
  };

  const handleResend = async (event: FormEvent) => {
    event.preventDefault();
    if (isResending) return;

    const trimmedDni = resendDni.trim();
    setResendMessage(null);
    if (!isValidDni(trimmedDni)) {
      setResendError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }

    setResendError(null);
    setIsResending(true);
    try {
      setResendMessage(await requestAppointmentCodes(trimmedDni));
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'No se pudo enviar el código. Inténtalo de nuevo.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Consultar citas"
        title="Ingresa tu DNI y el código de tu cita"
        subtitle="Con ellos puedes ver, reprogramar o cancelar tus citas."
        align="left"
      />

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Input
          label="DNI"
          name="dni"
          inputMode="numeric"
          maxLength={8}
          value={dni}
          onChange={(event) => setDni(event.target.value)}
          error={fieldErrors.dni}
          required
        />
        <Input
          label="Código de la cita"
          name="code"
          placeholder="KD-ABC234"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={fieldErrors.code}
          required
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Consultando…' : 'Ver mis citas'}
        </Button>
      </form>

      <div className="mt-8 border-t border-border pt-6">
        {!isResendOpen ? (
          <button
            type="button"
            onClick={openResend}
            className="text-sm font-medium text-brand-700 underline-offset-4 hover:text-brand-900 hover:underline"
          >
            ¿No tienes tu código? Te lo enviamos a tu correo
          </button>
        ) : (
          <form onSubmit={handleResend} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-ink-secondary">
              Escribe tu DNI y enviaremos los códigos de tus próximas citas al correo que registraste al reservar.
            </p>
            <Input
              label="DNI"
              name="resend-dni"
              inputMode="numeric"
              maxLength={8}
              value={resendDni}
              onChange={(event) => setResendDni(event.target.value)}
              error={resendError ?? undefined}
            />
            {resendMessage && (
              <p role="status" className="flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                {resendMessage}
              </p>
            )}
            <Button type="submit" variant="secondary" className="w-full" disabled={isResending}>
              {isResending ? 'Enviando…' : 'Enviarme mis códigos'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default ConsultAppointmentsPage;
