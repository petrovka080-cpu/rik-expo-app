// NAV-LAZY: Extracted from app/(tabs)/security.tsx which was a dead
// duplicate tab. This is the canonical source for the security screen.
import { SvgXml } from 'react-native-svg';
import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, Alert,
} from 'react-native';
import {
  challengeSecurityTotpFactor,
  enrollSecurityTotpFactor,
  listSecurityTotpFactors,
  unenrollSecurityTotpFactor,
  verifySecurityTotpFactor,
} from './SecurityScreen.auth.transport';

export function SecurityScreen() {
  const alive = useRef(false);
  const generation = useRef(0);
  const actionBusy = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [factors, setFactors] = useState<Array<{ id: string; status: string; friendly_name?: string }>>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);

  const clearEnrollment = useCallback(() => {
    setQrSvg(null); setUri(null); setSecret(null); setCode('');
  }, []);

  const loadFactors = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setLoadError(null); clearEnrollment();
    setFactorId(null); setEnabled(false); setFactors([]);
    try {
      const { data, error } = await listSecurityTotpFactors();
      if (error) throw error;
      if (!alive.current || version !== generation.current) return;
      const next = (data?.all ?? []).filter(f => f.factor_type === 'totp');
      const selected = next.find(f => f.status === 'verified') ?? next[0];
      setFactors(next); setFactorId(selected?.id ?? null);
      setEnabled(selected?.status === 'verified');
    } catch (e: any) {
      if (alive.current && version === generation.current) {
        setLoadError(e?.message ?? 'Не удалось получить состояние TOTP.');
      }
    } finally {
      if (alive.current && version === generation.current) setLoading(false);
    }
  }, [clearEnrollment]);

  useFocusEffect(useCallback(() => {
    alive.current = true;
    void loadFactors();
    return () => {
      alive.current = false; generation.current += 1; actionBusy.current = false;
      clearEnrollment(); setLoading(true); setFactorId(null); setFactors([]);
      setEnabled(false); setEnrolling(false); setVerifying(false); setUnenrolling(false);
    };
  }, [loadFactors, clearEnrollment]));

  const selectFactor = useCallback((id: string) => {
    if (actionBusy.current) return;
    generation.current += 1;
    clearEnrollment(); setFactorId(id);
    setEnabled(factors.find(f => f.id === id)?.status === 'verified');
  }, [factors, clearEnrollment]);

  const busy = loading || enrolling || verifying || unenrolling;

  const enrollTotp = useCallback(async () => {
    if (actionBusy.current || loading || loadError || factorId) return;
    actionBusy.current = true;
    const version = generation.current;
    try {
      setEnrolling(true);
      // 1) Регистрируем TOTP-фактор
      const { data, error } = await enrollSecurityTotpFactor();
      if (error) throw error;
      if (!alive.current || version !== generation.current) return;

      // Ожидаем структуру: { id, type, friendlyName?, totp: { qr_code, uri, secret } }
      setFactorId(data.id);
      setFactors(previous => [...previous, { id: data.id, status: 'unverified' }]);
      // На web удобно показать SVG-QR, на мобильных — выдать URI/секрет
      setQrSvg(data.totp?.qr_code ?? null);
      setUri(data.totp?.uri ?? null);
      setSecret(data.totp?.secret ?? null);

      Alert.alert('TOTP', 'Сканируй QR в приложении-аутентификаторе, затем введи 6-значный код ниже.');
    } catch (e: any) {
      if (alive.current && version === generation.current) Alert.alert('Не удалось включить TOTP', e?.message ?? 'Попробуйте еще раз.');
    } finally {
      if (alive.current && version === generation.current) { actionBusy.current = false; setEnrolling(false); }
    }
  }, [loading, loadError, factorId]);

  const verifyTotp = useCallback(async () => {
    if (actionBusy.current || loading || loadError) return;
    if (!factorId) { Alert.alert('TOTP не настроен', 'Сначала включите TOTP.'); return; }
    const clean = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) { Alert.alert('Код', 'Введи 6-значный код из приложения'); return; }

    actionBusy.current = true;
    const version = generation.current;
    try {
      setVerifying(true);
      // 2) Запрашиваем challenge
      const ch = await challengeSecurityTotpFactor(factorId);
      if (ch.error) throw ch.error;
      if (!alive.current || version !== generation.current) return;

      // 3) Проверяем код
      const vr = await verifySecurityTotpFactor({
        factorId,
        challengeId: ch.data.id,
        code: clean,
      });
      if (vr.error) throw vr.error;
      if (!alive.current || version !== generation.current) return;

      setEnabled(true);
      setFactors(previous => previous.map(f => f.id === factorId ? { ...f, status: 'verified' } : f));
      clearEnrollment();
      Alert.alert('Готово', enabled ? 'Вход подтверждён.' : 'TOTP включён для вашей учётной записи.');
    } catch (e: any) {
      if (alive.current && version === generation.current) Alert.alert('Не удалось подтвердить код', e?.message ?? 'Неверный код или ошибка верификации.');
    } finally {
      if (alive.current && version === generation.current) { actionBusy.current = false; setVerifying(false); }
    }
  }, [factorId, code, enabled, loading, loadError, clearEnrollment]);

  const unenrollTotp = useCallback(async () => {
    if (actionBusy.current || loading || loadError) return;
    if (!factorId) { Alert.alert('Нет активного фактора', 'Сначала включите TOTP.'); return; }
    actionBusy.current = true;
    const version = generation.current;
    try {
      setUnenrolling(true);
      const { error } = await unenrollSecurityTotpFactor(factorId);
      if (error) throw error;
      if (!alive.current || version !== generation.current) return;
      const remaining = factors.filter(f => f.id !== factorId);
      const selected = remaining.find(f => f.status === 'verified') ?? remaining[0];
      setFactors(remaining); setEnabled(selected?.status === 'verified');
      setFactorId(selected?.id ?? null); clearEnrollment();
      Alert.alert('Отключено', 'TOTP-фактор удалён.');
    } catch (e: any) {
      if (alive.current && version === generation.current) Alert.alert('Не удалось отключить TOTP', e?.message ?? 'Попробуйте еще раз.');
    } finally {
      if (alive.current && version === generation.current) { actionBusy.current = false; setUnenrolling(false); }
    }
  }, [factorId, factors, loading, loadError, clearEnrollment]);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>Безопасность</Text>

      <View style={s.card}>
        <Text style={s.h2}>TOTP-аутентификатор</Text>
        <Text style={s.meta}>
          Используйте приложение (Google Authenticator, 1Password, Authy и т. п.).
        </Text>

        {loading && <Text accessibilityLiveRegion="polite">Проверяю состояние TOTP…</Text>}
        {!!loadError && <View><Text accessibilityRole="alert">{loadError}</Text><Pressable testID="totp-retry" onPress={loadFactors}><Text>Повторить</Text></Pressable></View>}

        {!loading && !loadError && factors.length > 1 && factors.map((factor, index) => (
          <Pressable key={factor.id} testID={`totp-factor-${index}`} disabled={busy} onPress={() => selectFactor(factor.id)}>
            <Text>{factor.friendly_name || `Устройство ${index + 1}`}{factor.id === factorId ? ' ✓' : ''} — {factor.status === 'verified' ? 'активно' : 'не подтверждено'}</Text>
          </Pressable>
        ))}

        {!loading && !loadError && !factorId && (
          <Pressable
            testID="totp-enroll"
            onPress={enrollTotp}
            disabled={busy}
            style={[s.btn, enrolling ? s.btnDisabled : s.btnPrimary]}
          >
            <Text style={s.btnTxt}>{enrolling ? 'Включаю…' : 'Включить TOTP'}</Text>
          </Pressable>
        )}

        {!loading && !loadError && !!factorId && (
          <>
            {!enabled && (!!qrSvg ? (
  <View style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' }}>
    <SvgXml xml={qrSvg as string} width={220} height={220} />
  </View>
) : (
  // На iOS/Android даём URI/секрет для ручного добавления
  <View style={{ marginTop: 10 }}>
    {!!uri && <Text selectable style={s.kv}>URI: <Text style={s.code}>{uri}</Text></Text>}
    {!!secret && <Text selectable style={s.kv}>Секрет: <Text style={s.code}>{secret}</Text></Text>}
    {(!!secret || !!uri) ? <Text style={[s.meta, { marginTop: 6 }]}>
      Откройте приложение-аутентификатор → «Добавить» → «Ввести ключ вручную» и используйте секрет.
    </Text> : <Text style={s.meta}>Настройка не завершена. Введите код уже добавленного устройства или отмените настройку и начните заново.</Text>}
  </View>
))}


            <View style={{ marginTop: 12 }}>
              <Text>{enabled ? 'Подтверждение входа кодом из приложения:' : 'Код из приложения:'}</Text>
              <TextInput
                testID="totp-code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                editable={!busy}
                style={s.input}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                testID="totp-verify"
                onPress={verifyTotp}
                disabled={busy}
                style={[s.btn, verifying ? s.btnDisabled : s.btnPrimary]}
              >
                <Text style={s.btnTxt}>{verifying ? 'Проверяю…' : 'Подтвердить код'}</Text>
              </Pressable>

              <Pressable
                testID="totp-unenroll"
                onPress={unenrollTotp}
                disabled={busy}
                style={[s.btn, unenrolling ? s.btnDisabled : s.btnNeutral]}
              >
                <Text style={s.btnTxt}>{unenrolling ? 'Отключаю…' : enabled ? 'Отключить' : 'Отменить настройку'}</Text>
              </Pressable>
            </View>

            {enabled && <Text style={[s.ok, { marginTop: 8 }]}>TOTP активен ✓</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, backgroundColor: '#fff' },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  meta: { color: '#6b7280', marginTop: 4 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  kv: { marginTop: 6 },
  code: { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, marginTop: 6 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0b7285', borderColor: '#0b7285' },
  btnNeutral: { backgroundColor: '#6b7280', borderColor: '#6b7280' },
  btnDisabled: { backgroundColor: '#bbb', borderColor: '#bbb' },
  btnTxt: { color: '#fff', fontWeight: '700' },
  ok: { color: '#2e7d32', fontWeight: '700' },
});
