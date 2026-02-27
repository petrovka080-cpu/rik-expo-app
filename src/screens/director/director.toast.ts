import { useCallback, useEffect, useRef, useState } from "react";
import type { RtToast } from "./director.types";

export function useDirectorRtToast() {
  const [rtToast, setRtToast] = useState<RtToast>({
    visible: false,
    title: "",
    body: "",
    count: 0,
  });
  const rtToastTimerRef = useRef<any>(null);

  const showRtToast = useCallback((title?: string, body?: string) => {
    const t = String(title || "Операция").trim();
    const b = String(body || "").trim();

    if (rtToastTimerRef.current) {
      clearTimeout(rtToastTimerRef.current);
      rtToastTimerRef.current = null;
    }

    setRtToast((prev) => {
      const same = prev.visible && prev.title === t && prev.body === b;
      return {
        visible: true,
        title: t,
        body: b,
        count: same ? prev.count + 1 : 1,
      };
    });

    rtToastTimerRef.current = setTimeout(() => {
      setRtToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    showRtToast("✓ Готово", msg);
  }, [showRtToast]);

  useEffect(() => {
    return () => {
      if (rtToastTimerRef.current) {
        clearTimeout(rtToastTimerRef.current);
        rtToastTimerRef.current = null;
      }
    };
  }, []);

  return {
    rtToast,
    showRtToast,
    showSuccess,
  };
}
