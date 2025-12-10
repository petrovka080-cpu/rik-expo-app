import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../src/lib/supabaseClient';

export default function ResetScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase не настроен: проверьте EXPO_PUBLIC_SUPABASE_URL/ANON_KEY.');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
      });
      if (resetError) throw resetError;
      setMessage('Если email найден, ссылка для сброса отправлена.');
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось отправить письмо.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Сброс пароля</Text>
        <Text style={styles.subtitle}>Мы отправим письмо со ссылкой на сброс пароля.</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Отправить</Text>}
        </Pressable>

        <View style={styles.linksRow}>
          <Link href="/auth/login" style={styles.link}>Назад к входу</Link>
          <Link href="/auth/register" style={styles.link}>Регистрация</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#475569',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#DC2626',
    marginBottom: 8,
  },
  message: {
    color: '#15803D',
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  link: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
