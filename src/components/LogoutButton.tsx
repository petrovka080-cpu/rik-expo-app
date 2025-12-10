import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabaseClient';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth/login');
    } catch (e: any) {
      console.warn('[LogoutButton] signOut failed:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={onLogout}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null, loading ? styles.disabled : null]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Выйти</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});
