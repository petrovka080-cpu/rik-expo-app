import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  cameraReady: boolean;
  capturing: boolean;
  onCapture: () => void;
  onCancel: () => void;
  onPickPhoto: () => void;
  onSystemCamera: () => void;
};

export function MobilePhotoCaptureOverlay({
  cameraReady,
  capturing,
  onCapture,
  onCancel,
  onPickPhoto,
  onSystemCamera,
}: Props): React.ReactElement {
  return (
    <View style={styles.overlay} testID="mobile-photo-capture-overlay">
      <View style={styles.topLine}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u041e\u0442\u043c\u0435\u043d\u0430"
          onPress={onCancel}
          style={styles.smallButton}
          testID="mobile-photo-camera-cancel"
        >
          <Text style={styles.smallButtonText}>{"\u041e\u0442\u043c\u0435\u043d\u0430"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u0430\u044f \u043a\u0430\u043c\u0435\u0440\u0430"
          onPress={onSystemCamera}
          style={styles.smallButton}
          testID="mobile-photo-system-camera"
        >
          <Text style={styles.smallButtonText}>{"\u041a\u0430\u043c\u0435\u0440\u0430"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0444\u043e\u0442\u043e \u0438\u0437 \u0433\u0430\u043b\u0435\u0440\u0435\u0438"
          onPress={onPickPhoto}
          style={styles.smallButton}
          testID="mobile-photo-gallery"
        >
          <Text style={styles.smallButtonText}>{"\u0413\u0430\u043b\u0435\u0440\u0435\u044f"}</Text>
        </Pressable>
      </View>
      <View style={styles.bottomLine}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u0421\u0434\u0435\u043b\u0430\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a"
          disabled={!cameraReady || capturing}
          onPress={onCapture}
          style={[styles.shutter, (!cameraReady || capturing) && styles.shutterDisabled]}
          testID="mobile-photo-shutter"
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
    pointerEvents: "box-none",
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  bottomLine: {
    alignItems: "center",
  },
  smallButton: {
    minHeight: 36,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
});
