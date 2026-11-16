import { useEffect, useRef } from 'react';

interface FormErrorProps {
  message: string | null;
}

// Error de un formulario dentro de un contenido con scroll: al aparecer (o
// cambiar) se lleva a la vista, para que no quede oculto arriba de la lista.
function FormError({ message }: FormErrorProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message) {
      ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [message]);

  if (!message) return null;

  return (
    <p
      ref={ref}
      role="alert"
      className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
    >
      {message}
    </p>
  );
}

export default FormError;
