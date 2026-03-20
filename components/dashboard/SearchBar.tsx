"use client";

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder: string;
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ placeholder, onSearch, initialValue = '' }: SearchBarProps) {
  const [input, setInput] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(input);
    }, 300);
    return () => clearTimeout(handler);
  }, [input, onSearch]);

  // Sync with initialValue when it changes externally (e.g. tab switch)
  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

  return (
    <div className="relative flex-1 group">
      <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={16} />
      <input 
        type="text" 
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs md:text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 shadow-sm transition-all dark:placeholder:text-slate-600"
      />
    </div>
  );
}
