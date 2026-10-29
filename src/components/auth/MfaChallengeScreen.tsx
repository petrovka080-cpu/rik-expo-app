import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthAssuranceActions } from "./AuthAssuranceContext";
import { challengeSecurityTotpFactor, listSecurityTotpFactors, verifySecurityTotpFactor } from "../../screens/security/SecurityScreen.auth.transport";

type Factor = { id: string; friendly_name?: string };
export function MfaChallengeScreen() {
  const { userId, required, recheck, signOut } = useAuthAssuranceActions();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const epoch = useRef(0);
  const pending = useRef(false);
  const load = useCallback(async () => {
    const current = ++epoch.current;
    pending.current = true; setBusy(true); setCode(""); setFactors([]); setFactorId(""); setMessage(""); setLoadFailed(false);
    if (!required || !userId) { pending.current = false; setBusy(false); return; }
    try {
      const result = await listSecurityTotpFactors();
      if (current !== epoch.current) return;
      if (result.error) throw new Error("MFA_FACTORS_UNAVAILABLE");
      const verified = result.data.totp.filter((factor) => factor.status === "verified");
      setFactors(verified); setFactorId(verified[0]?.id ?? "");
      if (!verified.length) setMessage("Совместимое устройство подтверждения не найдено. Повторите проверку входа или обратитесь в поддержку.");
    } catch {
      if (current === epoch.current) { setLoadFailed(true); setMessage("Не удалось получить устройства. Проверьте соединение и повторите."); }
    } finally { if (current === epoch.current) { pending.current = false; setBusy(false); } }
  }, [required, userId]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { epoch.current += 1; pending.current = false; setCode(""); };
  }, [load]));

  const verify = async () => {
    if (pending.current || !required || !userId || !factorId || !/^\d{6}$/.test(code)) return;
    const current = epoch.current;
    const submittedCode = code;
    pending.current = true; setBusy(true); setCode(""); setMessage("");
    try {
      const challenge = await challengeSecurityTotpFactor(factorId);
      if (current !== epoch.current) return;
      if (challenge.error || !challenge.data?.id) throw new Error("MFA_CHALLENGE_FAILED");
      const verified = await verifySecurityTotpFactor({ factorId, challengeId: challenge.data.id, code: submittedCode });
      if (current !== epoch.current) return;
      if (verified.error) throw new Error("MFA_VERIFY_FAILED");
      // Only the root lifecycle decides that the new provider session is ready.
      await recheck();
    } catch {
      if (current === epoch.current) setMessage("Не удалось подтвердить код. Проверьте код и соединение, затем повторите.");
    } finally { if (current === epoch.current) { pending.current = false; setBusy(false); } }
  };
  const exit = async () => {
    if (pending.current) return;
    const current = epoch.current; pending.current = true; setBusy(true); setCode("");
    try { if (!await signOut() && current === epoch.current) setMessage("Не удалось выйти. Попробуйте ещё раз."); }
    catch { if (current === epoch.current) setMessage("Не удалось выйти. Попробуйте ещё раз."); }
    finally { if (current === epoch.current) { pending.current = false; setBusy(false); } }
  };
  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" testID="mfa-challenge-screen">
    <Text accessibilityRole="header" style={styles.title}>Подтвердите вход</Text>
    <Text>Введите шестизначный код из приложения аутентификации.</Text>
    {factors.length > 1 ? factors.map((factor, index) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: factorId === factor.id }} disabled={busy} key={factor.id} onPress={() => { setFactorId(factor.id); setCode(""); }} style={styles.button}><Text>{factor.friendly_name || `Устройство ${index + 1}`}</Text></Pressable>) : null}
    <TextInput testID="mfa-challenge-code" accessibilityLabel="Код подтверждения" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} maxLength={6} editable={!busy && Boolean(factorId)} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} style={styles.input} />
    <Pressable testID="mfa-challenge-verify" accessibilityRole="button" disabled={busy || !factorId || !/^\d{6}$/.test(code)} onPress={() => { void verify(); }} style={styles.button}><Text>{busy ? "Проверяем…" : "Подтвердить"}</Text></Pressable>
    {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    {loadFailed ? <Pressable testID="mfa-challenge-reload" accessibilityRole="button" disabled={busy} onPress={() => { void load(); }} style={styles.button}><Text>Повторить загрузку</Text></Pressable> : null}
    {!loadFailed && !factors.length && !busy ? <Pressable accessibilityRole="button" onPress={() => { void recheck(); }} style={styles.button}><Text>Повторить проверку входа</Text></Pressable> : null}
    <View style={{ height: 12 }} />
    <Pressable testID="mfa-challenge-exit" accessibilityRole="button" disabled={busy} onPress={() => { void exit(); }} style={styles.button}><Text>Выйти из аккаунта</Text></Pressable>
  </ScrollView>;
}
const styles = StyleSheet.create({ container: { flexGrow: 1, padding: 24, gap: 16, justifyContent: "center", backgroundColor: "#F8FAFC" }, title: { fontSize: 24, fontWeight: "600", color: "#0F172A" }, input: { borderWidth: 1, borderColor: "#64748B", borderRadius: 8, minHeight: 48, padding: 12, fontSize: 22, backgroundColor: "white" }, button: { minHeight: 48, padding: 14, backgroundColor: "#E2E8F0", borderRadius: 8 } });
