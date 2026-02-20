// src/ui/GlobalBusy.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Blur (expo-blur) опционально
let BlurViewAny: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurViewAny = require("expo-blur")?.BlurView ?? null;
} catch {
  BlurViewAny = null;
}

type BusyRunOpts = {
  key?: string;
  minMs?: number;
  label?: string;
  message?: string;
};

type BusyCtx = {
  key: string | null;
  label: string;

  show: (key?: string, label?: string) => void;
  hide: (key?: string) => void;

  isBusy: (key?: string) => boolean;

  run: <T>(fn: () => Promise<T>, opts?: BusyRunOpts) => Promise<T | null>;
};

const BusyContext = createContext<BusyCtx | null>(null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GlobalBusyProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: { text: string; cardBg?: string; border?: string };
}) {
  const [uiKey, setUiKey] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("Загрузка…");
  const [phase, setPhase] = useState<0 | 1>(0);

  const activeRef = useRef<Map<string, number>>(new Map());
  const lastShownKeyRef = useRef<string | null>(null);
  const startedAtRef = useRef<Record<string, number>>({});

  const recomputeUiKey = useCallback(() => {
    const keys = Array.from(activeRef.current.keys());
    if (!keys.length) {
      lastShownKeyRef.current = null;
      setUiKey(null);
      return;
    }
    const last = lastShownKeyRef.current;
    const next = last && activeRef.current.has(last) ? last : keys[keys.length - 1];
    lastShownKeyRef.current = next;
    setUiKey(next);
  }, []);

  const show = useCallback((k?: string, l?: string) => {
    const kk = String(k ?? "busy");
    const nextLabel = String(l ?? "Загрузка…");

if (__DEV__) {
  console.log("[GBUSY] show", { kk, nextLabel });
}
    const prevCount = activeRef.current.get(kk) ?? 0;
    activeRef.current.set(kk, prevCount + 1);

    startedAtRef.current[kk] = Date.now();
    setPhase(0);
    setLabel(nextLabel);

    lastShownKeyRef.current = kk;
    setUiKey(kk);
  }, []);



  const hide = useCallback(
    (k?: string) => {
      // ✅ важно: hide() без ключа тоже должен работать
      const kk = String(k ?? (uiKey ?? ""));
      if (!kk) {
        // если вообще нечего скрывать — просто пересчёт
        recomputeUiKey();
        return;
      }

      const prevCount = activeRef.current.get(kk) ?? 0;
      if (prevCount <= 1) activeRef.current.delete(kk);
      else activeRef.current.set(kk, prevCount - 1);

      if (uiKey === kk) recomputeUiKey();
      else if (activeRef.current.size === 0) recomputeUiKey();
    },
    [recomputeUiKey, uiKey]
  );

  const isBusy = useCallback((k?: string) => {
    if (!k) return activeRef.current.size > 0;
    return activeRef.current.has(String(k));
  }, []);

  useEffect(() => {
    if (!uiKey) return;
    const t = setTimeout(() => setPhase(1), 380);
    return () => clearTimeout(t);
  }, [uiKey]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts?: BusyRunOpts): Promise<T | null> => {
      const k = String(opts?.key ?? "busy");
      const minMs = Math.max(650, Number(opts?.minMs ?? 650));
      const text = String(opts?.label ?? opts?.message ?? "Загрузка…");

      // ✅ если этот key уже идёт — игнор
      if (activeRef.current.has(k)) return null;

      show(k, text);

      // дать модалке появиться
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await sleep(60);

      try {
        const res = await fn();
        return res;
      } finally {
        const started = startedAtRef.current[k] || Date.now();
        const elapsed = Date.now() - started;
        const wait = Math.max(0, minMs - elapsed);
        if (wait) await sleep(wait);

        hide(k);
      }
    },
    [show, hide]
  );

  const value = useMemo<BusyCtx>(
    () => ({ key: uiKey, label, show, hide, isBusy, run }),
    [uiKey, label, show, hide, isBusy, run]
  );

  const canBlur = Platform.OS !== "web" && !!BlurViewAny;
  const blurIntensity = phase === 0 ? 18 : 34;
  const dimOpacity = phase === 0 ? 0.70 : 0.82;

  return (
    <BusyContext.Provider value={value}>
      {children}

      <Modal
        visible={!!uiKey}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}
      >
        <View style={styles.full} pointerEvents="auto">
          {/* ✅ блокируем все тапы */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => {}} />

          {/* затемнение */}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000", opacity: dimOpacity },
            ]}
          />

          {/* blur поверх (опционально) */}
          {canBlur ? (
            <BlurViewAny
              intensity={blurIntensity}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg ?? "rgba(16,24,38,0.96)",
                borderColor: theme.border ?? "rgba(255,255,255,0.12)",
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {label || "Загрузка…"}
            </Text>
            <Text style={styles.sub}>Пожалуйста, подождите</Text>
          </View>
        </View>
      </Modal>
    </BusyContext.Provider>
  );
}

export function useGlobalBusy() {
  const ctx = useContext(BusyContext);
  if (!ctx) throw new Error("useGlobalBusy() must be used inside <GlobalBusyProvider />");
  return ctx;
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "84%",
    maxWidth: 360,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: { fontWeight: "900", fontSize: 14, textAlign: "center" },
  sub: {
    color: "rgba(255,255,255,0.70)",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
});

