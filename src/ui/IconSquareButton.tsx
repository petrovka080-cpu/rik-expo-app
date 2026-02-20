// src/ui/IconSquareButton.tsx
import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;

  width?: number;   // default 52
  height?: number;  // default 52
  radius?: number;  // default 16

  bg?: string;
  bgPressed?: string;
  bgDisabled?: string;

  spinnerColor?: string;

  // “дорогой” режим (верхний блик + нижняя глубина + премиум-бордер)
  luxGreen?: boolean;

  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
};

export default function IconSquareButton({
  onPress,
  disabled = false,
  loading = false,

  width = 52,
  height = 52,
  radius = 16,

  bg = "#0B0B0C",
  bgPressed = "#121316",
  bgDisabled = "#1A1A1A",

  spinnerColor = "#FFFFFF",
  luxGreen = false,

  children,
  testID,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;
  const isWeb = Platform.OS === "web";

  // ✅ На web НЕ используем scale вообще (иначе “плывёт”)
  // ✅ На native можно scale без проблем
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    if (isWeb) return;
    Animated.timing(scale, {
      toValue: 0.965,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [isWeb, scale]);

  const pressOut = useCallback(() => {
    if (isWeb) return;
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [isWeb, scale]);

  const press = useCallback(async () => {
    if (isDisabled) return;
    try {
      await onPress?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("IconSquareButton onPress error:", e);
    }
  }, [isDisabled, onPress]);

  const containerStyle = useMemo(() => {
    const base: ViewStyle = {
      width,
      height,
      minWidth: width,
      minHeight: height,
      borderRadius: radius,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      flexGrow: 0,
    };
    return base;
  }, [width, height, radius]);

  const borderColor = luxGreen ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)";
  const topGlow = luxGreen ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)";

  const wrapStyle = isWeb ? containerStyle : [containerStyle, { transform: [{ scale }] }];

  return (
    <Animated.View style={wrapStyle as any}>
      <Pressable
        testID={testID}
        disabled={isDisabled}
        onPress={press}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.btn,
          {
            borderRadius: radius,
            backgroundColor: isDisabled ? bgDisabled : pressed ? bgPressed : bg,
            borderWidth: 1,
            borderColor,

            // ✅ СТАБИЛЬНО (без анимированных теней)
            shadowOpacity: isDisabled ? 0 : 0.26,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: isDisabled ? 0 : 8,

            ...(isWeb ? ({ cursor: isDisabled ? "not-allowed" : "pointer" } as any) : null),
          },
        ]}
      >
        {/* ✅ “дорогой” свет/глубина — СТАБИЛЬНО, НЕ ЛОМАЕТ LAYOUT */}
        {!isDisabled ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}>
            <View
              style={{
                position: "absolute",
                top: 1,
                left: 1,
                right: 1,
                height: "46%",
                borderRadius: radius - 2,
                backgroundColor: topGlow,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 1,
                left: 1,
                right: 1,
                height: "40%",
                borderRadius: radius - 2,
                backgroundColor: "rgba(0,0,0,0.12)",
              }}
            />
          </View>
        ) : null}

        <View style={styles.center}>
          {loading ? <ActivityIndicator color={spinnerColor} /> : children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
  },
  center: { alignItems: "center", justifyContent: "center" },
});
