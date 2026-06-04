import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { serializeBuildIdentity } from "../lib/release/buildIdentity";

export function BuildIdentityMarker() {
  return (
    <View
      accessibilityLabel="BUILD_IDENTITY_HOST"
      accessible
      collapsable={false}
      importantForAccessibility="yes"
      pointerEvents="none"
      style={styles.host}
      testID="build-identity-host"
    >
      <Text
        accessibilityLabel="BUILD_IDENTITY"
        accessible
        importantForAccessibility="yes"
        nativeID="BUILD_IDENTITY"
        style={styles.text}
        testID="build-identity"
      >
        {serializeBuildIdentity()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 24,
    left: 1,
    zIndex: 9999,
    elevation: 9999,
    width: 320,
    height: 18,
    opacity: 1,
  },
  text: {
    color: "rgba(255,255,255,0.01)",
    fontSize: 4,
    lineHeight: 5,
    width: 320,
    height: 18,
  },
});
