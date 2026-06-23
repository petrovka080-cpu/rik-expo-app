import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import type { CameraPermissionState } from "../../lib/mobilePhotoCapture/mobileCameraPermissionService";

type Props = {
  state: CameraPermissionState;
  onRequestPermission: () => void;
  onPickPhoto: () => void;
  onCancel: () => void;
};

export function MobilePhotoPermissionGate({
  state,
  onRequestPermission,
  onPickPhoto,
  onCancel,
}: Props): React.ReactElement {
  const permanent = state === "DENIED_PERMANENT" || state === "RESTRICTED";
  return (
    <View style={styles.wrap} testID="mobile-photo-permission-gate">
      <Text style={styles.title}>
        {permanent
          ? "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043a\u0430\u043c\u0435\u0440\u0435 \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d."
          : "\u0421\u0444\u043e\u0442\u043e\u0433\u0440\u0430\u0444\u0438\u0440\u0443\u0439\u0442\u0435 \u0443\u043f\u0430\u043a\u043e\u0432\u043a\u0443, \u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434 \u0438 \u0446\u0435\u043d\u043d\u0438\u043a."}
      </Text>
      <View style={styles.actions}>
        {permanent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"
            onPress={() => Linking.openSettings()}
            style={styles.primary}
            testID="mobile-photo-open-settings"
          >
            <Text style={styles.primaryText}>{"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443"
            onPress={onRequestPermission}
            style={styles.primary}
            testID="mobile-photo-request-permission"
          >
            <Text style={styles.primaryText}>{"\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443"}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0433\u043e\u0442\u043e\u0432\u043e\u0435 \u0444\u043e\u0442\u043e"
          onPress={onPickPhoto}
          style={styles.secondary}
          testID="mobile-photo-pick-library"
        >
          <Text style={styles.secondaryText}>{"\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0444\u043e\u0442\u043e"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u041e\u0442\u043c\u0435\u043d\u0430"
          onPress={onCancel}
          style={styles.secondary}
          testID="mobile-photo-cancel"
        >
          <Text style={styles.secondaryText}>{"\u041e\u0442\u043c\u0435\u043d\u0430"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  title: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  actions: {
    gap: 8,
  },
  primary: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondary: {
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
