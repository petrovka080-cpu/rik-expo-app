import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, Platform, ViewStyle, TextStyle } from 'react-native';

type Props<T = void> = {
  label: string;
  actionKey: string;
  busyKey: string | null;
  run: (key: string, fn: () => Promise<void>) => Promise<void>;

  onPress?: () => Promise<void>;

  // 2-фазный режим
  prepare?: () => Promise<T | null>;
  onPressWithPayload?: (payload: T) => Promise<void>;

  // текст на фазе prepare
  preparingLabel?: string;

  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function BusyButton<T = void>({
  label,
  actionKey,
  busyKey,
  run,
  onPress,
  prepare,
  onPressWithPayload,
  preparingLabel = 'Открываю…',
  variant = 'secondary',
  style,
  textStyle,
}: Props<T>) {
  const [preparing, setPreparing] = useState(false);

  const loadingGlobal = busyKey === actionKey;
  const disabledGlobal = !!busyKey;

  // ✅ показываем спиннер и в prepare, и в busyKey
  const loading = loadingGlobal || preparing;

  const bg =
    variant === 'primary' ? '#111827' :
    variant === 'danger'  ? '#EF4444' :
    '#EEE';

  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#fff'
      : '#0F172A';

  const handle = async () => {
    if (disabledGlobal) return;

    // 1) двухфазный режим
    if (prepare && onPressWithPayload) {
      setPreparing(true);
      try {
        const payload = await prepare(); // тут может быть openAttachment или picker
        if (payload == null) return;     // отмена → просто выходим
        // дальше уже реальная операция → под глобальным busyKey
        await run(actionKey, async () => { await onPressWithPayload(payload); });
      } finally {
        setPreparing(false);
      }
      return;
    }

    // 2) обычный режим
    if (onPress) {
      await run(actionKey, async () => { await onPress(); });
    }
  };

  const title = loadingGlobal
    ? 'Загрузка…'
    : preparing
      ? preparingLabel
      : label;

  return (
    <Pressable
      disabled={disabledGlobal}
      onPress={handle}
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabledGlobal ? 0.7 : 1,
          ...(Platform.OS === 'web'
            ? { cursor: disabledGlobal ? 'not-allowed' : 'pointer', userSelect: 'none' }
            : null),
        } as any,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg as any} /> : null}
      <Text style={[{ fontWeight: '800', color: fg } as any, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

