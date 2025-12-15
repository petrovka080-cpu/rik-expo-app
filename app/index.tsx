import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabaseClient';
import { getMyRole } from '../src/lib/rik_api';
import { pathForRole, FALLBACK_TAB } from '../src/lib/authRouting';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      if (!supabase) {
        router.replace('/auth/login');
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session) {
          router.replace('/auth/login');
          return;
        }

        let href = FALLBACK_TAB;
        try {
          href = pathForRole(await getMyRole());
        } catch {
          href = FALLBACK_TAB;
        }
        router.replace(href);
      } catch (e) {
        console.warn('[index] session bootstrap failed:', (e as any)?.message ?? e);
        router.replace('/auth/login');
      } finally {
        if (active) setChecking(false);
      }
    };

    bootstrap();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#111827" />
      <Text style={styles.text}>Загрузка…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '500',
  },
});

