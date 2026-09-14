interface SpinnerProps {
  size?: number;
  className?: string;
}

function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-brand-600 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Cargando"
    />
  );
}

export default Spinner;
