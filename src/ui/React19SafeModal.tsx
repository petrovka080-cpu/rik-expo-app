import React from "react";
import RNModal from "react-native-modal";
import {
  Modal as CoreModal,
  KeyboardAvoidingView,
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

const flattenNativeHostStyle = (style: StyleProp<ViewStyle>) => {
  const flattened = StyleSheet.flatten(style);
  return flattened ? [styles.nativeContentHost, flattened] : styles.nativeContentHost;
};

const styles = StyleSheet.create({
  nativeBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  nativeContentHost: {
    flex: 1,
  },
  nativeRoot: {
    flex: 1,
  },
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
      avoidKeyboard,
      statusBarTranslucent,
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

    if (Platform.OS === "android") {
      const resolvedBackdropOpacity = clampBackdropOpacity(backdropOpacity);
      const handleNativeRequestClose = () => {
        if (typeof onBackButtonPress === "function") {
          onBackButtonPress();
          return;
        }
        onBackdropPress?.();
      };

      const content = (
        <View
          ref={forwardedRef as React.Ref<React.ElementRef<typeof View>>}
          testID="react19-safe-modal-native-content"
          pointerEvents="box-none"
          style={flattenNativeHostStyle(style)}
        >
          {children}
        </View>
      );

      return (
        <CoreModal
          transparent
          visible={!!isVisible}
          animationType="fade"
          statusBarTranslucent={statusBarTranslucent}
          onRequestClose={handleNativeRequestClose}
        >
          <View testID="react19-safe-modal-native-root" style={styles.nativeRoot} pointerEvents="box-none">
            {React.isValidElement(customBackdrop) ? (
              <View style={styles.nativeBackdrop}>{customBackdrop}</View>
            ) : (
              <Pressable
                testID="react19-safe-modal-native-backdrop"
                accessibilityRole="button"
                onPress={onBackdropPress}
                style={[
                  styles.nativeBackdrop,
                  {
                    backgroundColor: `rgba(0,0,0,${resolvedBackdropOpacity})`,
                  },
                ]}
              />
            )}

            {avoidKeyboard ? (
              <KeyboardAvoidingView style={styles.nativeRoot} pointerEvents="box-none">
                {content}
              </KeyboardAvoidingView>
            ) : (
              content
            )}
          </View>
        </CoreModal>
      );
    }

    if (Platform.OS !== "web") {
      return (
        <RNModal
          ref={forwardedRef as React.Ref<React.ComponentRef<typeof RNModal>>}
          isVisible={isVisible}
          onBackdropPress={onBackdropPress}
          onBackButtonPress={onBackButtonPress}
          backdropOpacity={backdropOpacity}
          avoidKeyboard={avoidKeyboard}
          statusBarTranslucent={statusBarTranslucent}
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
