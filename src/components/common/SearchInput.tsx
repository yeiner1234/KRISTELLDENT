import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

function SearchInput({ wrapperClassName = '', className = '', placeholder = 'Buscar...', ...rest }: SearchInputProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-brand-900 transition-colors focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 ${wrapperClassName}`}
    >
      <Search size={16} className="shrink-0 text-ink-tertiary" />
      <input
        type="search"
        placeholder={placeholder}
        className={`w-full min-w-0 bg-transparent outline-none ${className}`}
        {...rest}
      />
    </div>
  );
}

export default SearchInput;
