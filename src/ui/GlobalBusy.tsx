// src/ui/GlobalBusy.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

type BusyCtx = {
  key: string | null;
  show: (key?: string) => void;
  hide: (key?: string) => void;
  run: <T>(fn: () => Promise<T>, opts?: { key?: string; minMs?: number }) => Promise<T>;
};

const BusyContext = createContext<BusyCtx | null>(null);

export function GlobalBusyProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: { text: string };
}) {
  const [key, setKey] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);

  // 0 = быстрый (лёгкий blur), 1 = долгий (сильнее)
  const [phase, setPhase] = useState<0 | 1>(0);

  const show = useCallback((k?: string) => {
    startedAtRef.current = Date.now();
    setPhase(0);
    setKey(String(k ?? "busy"));
  }, []);

  const hide = useCallback((k?: string) => {
    setKey((prev) => {
      if (!prev) return null;
      if (k && String(k) !== prev) return prev; // защита от гонок
      return null;
    });
  }, []);

  // Если операция “длинная” — усиливаем blur через порог
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => setPhase(1), 380); // порог “долго”
    return () => clearTimeout(t);
  }, [key]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts?: { key?: string; minMs?: number }) => {
      const k = String(opts?.key ?? "busy");
      const minMs = Math.max(0, Number(opts?.minMs ?? 220)); // анти-мигание
      show(k);

      try {
        return await fn();
      } finally {
        const elapsed = Date.now() - (startedAtRef.current || Date.now());
        const wait = Math.max(0, minMs - elapsed);
        if (wait) await new Promise((r) => setTimeout(r, wait));
        hide(k);
      }
    },
    [show, hide],
  );

  const value = useMemo<BusyCtx>(() => ({ key, show, hide, run }), [key, show, hide, run]);

  // прод-настройки
  const blurIntensity = phase === 0 ? 12 : 26;         // слабый → сильнее
  const dimOpacity = phase === 0 ? 0.10 : 0.18;        // подстраховка (особенно web/андроид)
  const spinnerSize = Platform.OS === "ios" ? "small" : "large";

  return (
    <BusyContext.Provider value={value}>
      {children}

      {key ? (
        <View style={styles.overlay} pointerEvents="auto">
          {Platform.OS !== "web" ? (
            <>
              <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
              {/* лёгкий dim поверх blur — делает контраст ровнее */}
              <View style={[styles.dim, { opacity: dimOpacity }]} />
            </>
          ) : (
            <View style={[styles.webDim, { opacity: dimOpacity + 0.06 }]} />
          )}

          <ActivityIndicator size={spinnerSize as any} color={theme.text} />
        </View>
      ) : null}
    </BusyContext.Provider>
  );
}

export function useGlobalBusy() {
  const ctx = useContext(BusyContext);
  if (!ctx) throw new Error("useGlobalBusy() must be used inside <GlobalBusyProvider />");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  webDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,1)",
  },
});
