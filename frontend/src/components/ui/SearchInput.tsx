import * as React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-slate-750 placeholder-slate-400 shadow-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/50 cursor-pointer border-0 bg-transparent flex items-center justify-center"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
