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
import { requestPasswordResetEmail } from '../../src/lib/auth/passwordReset.transport';
import { withScreenErrorBoundary } from '../../src/shared/ui/ScreenErrorBoundary';

function ResetScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleText = '\u0421\u0431\u0440\u043e\u0441 \u043f\u0430\u0440\u043e\u043b\u044f';
  const subtitleText =
    '\u041c\u044b \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u043c \u043f\u0438\u0441\u044c\u043c\u043e \u0441\u043e \u0441\u0441\u044b\u043b\u043a\u043e\u0439 \u043d\u0430 \u0441\u0431\u0440\u043e\u0441 \u043f\u0430\u0440\u043e\u043b\u044f.';
  const submitLabel = '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c';
  const loginLinkLabel =
    '\u041d\u0430\u0437\u0430\u0434 \u043a \u0432\u0445\u043e\u0434\u0443';
  const registerLinkLabel =
    '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f';
  const missingSupabaseMessage =
    'Supabase \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d: \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 EXPO_PUBLIC_SUPABASE_URL/ANON_KEY.';
  const successMessage =
    '\u0415\u0441\u043b\u0438 email \u043d\u0430\u0439\u0434\u0435\u043d, \u0441\u0441\u044b\u043b\u043a\u0430 \u0434\u043b\u044f \u0441\u0431\u0440\u043e\u0441\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430.';
  const fallbackErrorMessage =
    '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043f\u0438\u0441\u044c\u043c\u043e.';

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!supabase) throw new Error(missingSupabaseMessage);
      const { error: resetError } = await requestPasswordResetEmail({
        email,
        redirectTo: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
      });
      if (resetError) throw resetError;
      setMessage(successMessage);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : fallbackErrorMessage);
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
        <Text style={styles.title} accessibilityRole="header">
          {titleText}
        </Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
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

        <Pressable
          style={styles.button}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </Pressable>

        <View style={styles.linksRow}>
          <Link
            href="/auth/login"
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel={loginLinkLabel}
          >
            {loginLinkLabel}
          </Link>
          <Link
            href="/auth/register"
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel={registerLinkLabel}
          >
            {registerLinkLabel}
          </Link>
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

export default withScreenErrorBoundary(ResetScreen, {
  screen: 'auth',
  route: '/auth/reset',
});
