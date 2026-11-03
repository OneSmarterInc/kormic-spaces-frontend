import { useEffect, useState } from 'react';

/** Debounce text entry only. Sort, filter and pagination requests remain immediate. */
export function useDebouncedSearch(value: string) {
  const normalized = value.trim();
  const [settled, setSettled] = useState(normalized);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(normalized), 200);
    return () => clearTimeout(timer);
  }, [normalized]);
  return settled;
}
