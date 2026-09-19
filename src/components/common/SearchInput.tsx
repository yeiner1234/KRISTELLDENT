import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

function SearchInput({ wrapperClassName = '', className = '', placeholder = 'Buscar...', ...rest }: SearchInputProps) {
  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-[9px] border border-adm-line-control bg-adm-surface-hover px-3 text-[13px] text-adm-ink-700 transition-colors focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-adm-accent-ring ${wrapperClassName}`}
    >
      <Search size={16} className="shrink-0 text-adm-ink-200" strokeWidth={1.75} />
      <input
        type="search"
        placeholder={placeholder}
        className={`w-full min-w-0 bg-transparent outline-none placeholder:text-adm-ink-200 ${className}`}
        {...rest}
      />
    </div>
  );
}

export default SearchInput;
