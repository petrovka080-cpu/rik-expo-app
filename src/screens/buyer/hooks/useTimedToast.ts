import { useCallback, useEffect, useRef, useState } from "react";

export function useTimedToast(defaultMs: number) {
  const [toastState, setToastState] = useState<{ message: string; hideAt: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const clearFrame = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const showToast = useCallback((msg: string, ms = defaultMs) => {
    clearFrame();
    setToastState({
      message: msg,
      hideAt: Date.now() + Math.max(0, ms),
    });
  }, [clearFrame, defaultMs]);

  useEffect(() => {
    if (!toastState) return undefined;

    const tick = () => {
      if (Date.now() >= toastState.hideAt) {
        setToastState(null);
        frameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      clearFrame();
    };
  }, [clearFrame, toastState]);

  return { toast: toastState?.message ?? null, showToast };
}
