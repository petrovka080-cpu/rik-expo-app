import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { CapturedPhotoAsset } from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";

type Props = {
  asset: CapturedPhotoAsset;
  onRetake: () => void;
  onUsePhoto: () => void;
};

export function MobilePhotoReviewScreen({
  asset,
  onRetake,
  onUsePhoto,
}: Props): React.ReactElement {
  return (
    <View style={styles.wrap} testID="mobile-photo-review-screen">
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={{ uri: asset.localUri }}
        style={styles.image}
        testID="mobile-photo-review-image"
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u041f\u0435\u0440\u0435\u0441\u043d\u044f\u0442\u044c"
          onPress={onRetake}
          style={styles.secondary}
          testID="mobile-photo-retake"
        >
          <Text style={styles.secondaryText}>{"\u041f\u0435\u0440\u0435\u0441\u043d\u044f\u0442\u044c"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u0444\u043e\u0442\u043e"
          onPress={onUsePhoto}
          style={styles.primary}
          testID="mobile-photo-use"
        >
          <Text style={styles.primaryText}>{"\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u0444\u043e\u0442\u043e"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
    backgroundColor: "#020617",
  },
  image: {
    flex: 1,
    minHeight: 320,
    width: "100%",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  primary: {
    flex: 1,
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
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "900",
  },
});
