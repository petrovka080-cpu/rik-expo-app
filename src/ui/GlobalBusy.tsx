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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Portal } from "react-native-portalize";
import {
  createGlobalBusyOwner,
  type BusyRunOpts,
  type GlobalBusySnapshot,
} from "./globalBusy.owner";

// Blur (expo-blur)
let BlurViewAny: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurViewAny = require("expo-blur")?.BlurView ?? null;
} catch {
  BlurViewAny = null;
}

export type BusyCtx = {
  key: string | null;
  label: string;
  show: (key?: string, label?: string) => void;
  hide: (key?: string) => void;
  isBusy: (key?: string) => boolean;
  run: (fn: () => Promise<any>, opts?: BusyRunOpts) => Promise<any>;
};

const BusyContext = createContext<BusyCtx | null>(null);

export function GlobalBusyProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: { text: string; cardBg?: string; border?: string };
}) {
  const ownerRef = useRef<ReturnType<typeof createGlobalBusyOwner> | null>(null);
  let owner = ownerRef.current;
  if (!owner) {
    owner = createGlobalBusyOwner();
    ownerRef.current = owner;
  }
  const [snapshot, setSnapshot] = useState<GlobalBusySnapshot>(() => owner.getSnapshot());
  const [phase, setPhase] = useState<0 | 1>(0);

  const show = useCallback((key?: string, label?: string) => {
    owner.show(key, label);
  }, [owner]);

  const hide = useCallback((key?: string) => {
    owner.hide(key);
  }, [owner]);

  const isBusy = useCallback((key?: string) => {
    return owner.isBusy(key);
  }, [owner]);

  const run = useCallback(
    async (fn: () => Promise<any>, opts?: BusyRunOpts): Promise<any> => {
      return await owner.run(fn, opts);
    },
    [owner],
  );

  useEffect(() => {
    owner.setSnapshotListener(setSnapshot);
    setSnapshot(owner.getSnapshot());
    return () => {
      owner.setSnapshotListener(null);
      owner.dispose();
    };
  }, [owner]);

  useEffect(() => {
    if (!snapshot.uiKey) return;
    setPhase(0);
    const t = setTimeout(() => setPhase(1), 380);
    return () => clearTimeout(t);
  }, [snapshot.uiKey]);

  const value = useMemo<BusyCtx>(
    () => ({
      key: snapshot.uiKey,
      label: snapshot.label,
      show,
      hide,
      isBusy,
      run,
    }),
    [snapshot.uiKey, snapshot.label, show, hide, isBusy, run],
  );

  const canBlur = Platform.OS !== "web" && !!BlurViewAny;
  const blurIntensity = phase === 0 ? 18 : 34;
  const dimOpacity = phase === 0 ? 0.70 : 0.82;

  return (
    <BusyContext.Provider value={value}>
      {children}
      {!!snapshot.uiKey && (
        <Portal>
          <View style={[styles.full, { zIndex: 99999, elevation: 99999 }]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => {}} />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: "#000", opacity: dimOpacity },
              ]}
            />
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
                {snapshot.label || "Загрузка…"}
              </Text>
              <Text style={styles.sub}>Пожалуйста, подождите</Text>
            </View>
          </View>
        </Portal>
      )}
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
