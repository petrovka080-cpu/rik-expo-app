import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

export function AuthAssuranceOverlay({ blocked, unavailable, onRetry, onSignOut, children }: {
  blocked: boolean;
  unavailable: boolean;
  onRetry: () => Promise<boolean>;
  onSignOut: () => Promise<boolean>;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (blocked) Keyboard.dismiss(); }, [blocked]);
  const run = async (action: () => Promise<boolean>, signingOut: boolean) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setSignOutFailed(false);
    try {
      const success = await action();
      if (active.current && signingOut && !success) setSignOutFailed(true);
    } catch { if (active.current && signingOut) setSignOutFailed(true); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  return <View style={styles.root}>
    {/* Keep the navigator and draft owners mounted. display:none also prevents
        keyboard/tab access on Web while the protected UI is gated. */}
    <View testID="auth-assurance-retained-content" style={{ flex: 1, display: blocked ? "none" : "flex" }}>
      {children}
    </View>
    {blocked ? <View style={styles.panel} accessibilityViewIsModal testID="auth-assurance-overlay">
      {!unavailable ? <ActivityIndicator accessibilityLabel="Проверка входа" /> : null}
      <Text accessibilityRole="header" style={styles.title}>{unavailable ? "Не удалось проверить вход" : "Проверяем вход"}</Text>
      <Text style={styles.message}>{unavailable ? "Проверьте соединение и повторите. Сессия и незавершённые данные сохранены." : "Это займёт немного времени."}</Text>
      {unavailable ? <>
        <Pressable accessibilityRole="button" testID="auth-assurance-retry" disabled={busy} onPress={() => { void run(onRetry, false); }} style={styles.button}><Text>Повторить</Text></Pressable>
        <Pressable accessibilityRole="button" testID="auth-assurance-sign-out" disabled={busy} onPress={() => { void run(onSignOut, true); }} style={styles.button}><Text>Выйти из аккаунта</Text></Pressable>
      </> : null}
      {signOutFailed ? <Text>Не удалось выйти. Попробуйте ещё раз.</Text> : null}
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, panel: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", gap: 16 }, title: { fontSize: 22, fontWeight: "600", color: "#0F172A" }, message: { textAlign: "center", color: "#334155", maxWidth: 460 }, button: { minHeight: 48, padding: 14, backgroundColor: "#E2E8F0", borderRadius: 8 } });
