import { useCallback, useEffect, useRef, useState } from "react";

export function useTimedToast(defaultMs: number) {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ms = defaultMs) => {
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
    } catch {
      // no-op
    }
    setToast(msg);
    timerRef.current = setTimeout(() => setToast(null), ms);
  }, [defaultMs]);

  useEffect(() => {
    return () => {
      try {
        if (timerRef.current) clearTimeout(timerRef.current);
      } catch {
        // no-op
      }
    };
  }, []);

  return { toast, showToast };
}

