// src/lib/useFocusThrottledLoad.ts
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Запускает load() при фокусе экрана, но НЕ чаще чем раз в throttleMs.
 * Решает лаги от повторной загрузки при быстрых переключениях табов на web.
 */
export function useFocusThrottledLoad(load: () => void, throttleMs = 1200) {
  const lastRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRef.current < throttleMs) return;
      lastRef.current = now;
      load();
    }, [load, throttleMs])
  );
}
