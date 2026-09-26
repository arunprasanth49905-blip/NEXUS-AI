import React from 'react';
import { Search, X } from 'lucide-react';
import './SearchInput.css';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  shortcut,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div className={`nexus-search-bar ${className}`}>
      <Search size={15} className="nexus-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="nexus-search-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        {...props}
      />
      {value ? (
        <button
          type="button"
          className="nexus-search-clear"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          aria-label="Clear search query"
        >
          <X size={14} />
        </button>
      ) : shortcut ? (
        <kbd className="nexus-search-shortcut" aria-hidden="true">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
};
