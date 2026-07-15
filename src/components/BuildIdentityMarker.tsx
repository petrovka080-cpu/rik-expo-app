import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { serializeBuildIdentity } from "../lib/release/buildIdentity";

export function BuildIdentityMarker() {
  return (
    <View
      accessibilityLabel="BUILD_IDENTITY_HOST"
      accessible
      collapsable={false}
      importantForAccessibility="yes"
      style={[styles.host, Platform.OS === "web" ? styles.webHiddenHost : null]}
      testID="build-identity-host"
    >
      <Text
        accessibilityLabel="BUILD_IDENTITY"
        accessible
        importantForAccessibility="yes"
        nativeID="BUILD_IDENTITY"
        style={[styles.text, Platform.OS === "web" ? styles.webHiddenText : null]}
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
    pointerEvents: "none",
  },
  text: {
    color: "rgba(255,255,255,0.01)",
    fontSize: 4,
    lineHeight: 5,
    width: 320,
    height: 18,
  },
  webHiddenHost: {
    display: "none",
  },
  webHiddenText: {
    display: "none",
  },
});
