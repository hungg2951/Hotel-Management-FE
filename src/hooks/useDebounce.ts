import { useState, useEffect } from 'react';

/**
 * Custom hook debounce giá trị nhập vào với thời gian trễ mặc định 700ms
 * Phù hợp cho các input tìm kiếm call API
 */
export function useDebounce<T>(value: T, delay: number = 700): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
