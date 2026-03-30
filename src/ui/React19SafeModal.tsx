import React from "react";
import RNModal from "react-native-modal";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type NativeModalProps = Partial<React.ComponentProps<typeof RNModal>> & {
  children?: React.ReactNode;
  isVisible?: boolean;
};
type CompatModalHandle =
  | React.ComponentRef<typeof RNModal>
  | React.ElementRef<typeof View>;

const asWebStyle = (style: Record<string, unknown>) =>
  style as unknown as ViewStyle;

const clampBackdropOpacity = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.7;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return numeric;
};

const flattenWebHostStyle = (style: StyleProp<ViewStyle>) => {
  const flattened = StyleSheet.flatten(style);
  return flattened ? [styles.webContentHost, flattened] : styles.webContentHost;
};

const styles = StyleSheet.create({
  webBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  webContentHost: {
    flex: 1,
  },
});

const React19SafeModal = React.forwardRef<CompatModalHandle, NativeModalProps>(
  function React19SafeModal(
    {
      isVisible,
      onBackdropPress,
      onBackButtonPress,
      backdropOpacity = 0.7,
      style,
      children,
      customBackdrop,
      ...nativeProps
    },
    forwardedRef,
  ) {
    React.useEffect(() => {
      if (Platform.OS !== "web" || !isVisible) return;
      if (typeof window === "undefined") return;
      if (
        typeof window.addEventListener !== "function" ||
        typeof window.removeEventListener !== "function"
      ) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (typeof onBackButtonPress === "function") {
          onBackButtonPress();
          return;
        }
        onBackdropPress?.();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isVisible, onBackdropPress, onBackButtonPress]);

    if (Platform.OS !== "web") {
      return (
        <RNModal
          ref={forwardedRef as React.Ref<React.ComponentRef<typeof RNModal>>}
          isVisible={isVisible}
          onBackdropPress={onBackdropPress}
          onBackButtonPress={onBackButtonPress}
          backdropOpacity={backdropOpacity}
          style={style}
          customBackdrop={customBackdrop}
          {...nativeProps}
        >
          {children}
        </RNModal>
      );
    }

    if (!isVisible) return null;

    const resolvedBackdropOpacity = clampBackdropOpacity(backdropOpacity);

    return (
      <View
        testID="react19-safe-modal-root"
        pointerEvents="box-none"
        style={asWebStyle({
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 9999,
        })}
      >
        {React.isValidElement(customBackdrop) ? (
          <View
            style={asWebStyle({
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            })}
          >
            {customBackdrop}
          </View>
        ) : (
          <Pressable
            testID="react19-safe-modal-backdrop"
            accessibilityRole="button"
            onPress={onBackdropPress}
            style={[
              styles.webBackdrop,
              {
                backgroundColor: `rgba(0,0,0,${resolvedBackdropOpacity})`,
              },
            ]}
          />
        )}

        <View
          ref={forwardedRef as React.Ref<React.ElementRef<typeof View>>}
          testID="react19-safe-modal-content"
          pointerEvents="box-none"
          style={flattenWebHostStyle(style)}
        >
          {children}
        </View>
      </View>
    );
  },
);

React19SafeModal.displayName = "React19SafeModal";

export default React19SafeModal;
