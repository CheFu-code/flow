'use client';

import { useRef, type ChangeEvent } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface HeaderSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function HeaderSearch({ query, onQueryChange }: HeaderSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value);
  };

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <label className={styles.searchBox}>
      <Search aria-hidden="true" className={styles.searchIcon} size={19} />
      <input
        aria-label="Search mail"
        onChange={handleChange}
        placeholder="Search in mail..."
        ref={inputRef}
        type="search"
        value={query}
      />
      {query ? (
        <button
          aria-label="Clear search query"
          className={styles.searchAction}
          data-tooltip="Clear search"
          onClick={handleClear}
          type="button"
        >
          <X size={17} />
        </button>
      ) : (
        <span
          aria-label="Filter mail"
          className={styles.searchFilterIcon}
          title="Search filters"
        >
          <SlidersHorizontal size={17} />
        </span>
      )}
    </label>
  );
}
