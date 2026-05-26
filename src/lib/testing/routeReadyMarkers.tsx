import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const ROUTE_PROOF_MARKERS = {
  appRoot: "ROUTE_PROOF_APP_ROOT_READY",
  request: "ROUTE_PROOF_REQUEST_ROUTE_READY",
  embeddedAi: "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY",
} as const;

export type RouteProofMarker = (typeof ROUTE_PROOF_MARKERS)[keyof typeof ROUTE_PROOF_MARKERS];

export function RouteReadyMarker({ marker }: { marker: RouteProofMarker }) {
  if (!__DEV__) return null;

  return (
    <View
      accessibilityLabel={`${marker}_HOST`}
      accessible
      collapsable={false}
      importantForAccessibility="yes"
      pointerEvents="none"
      style={styles.host}
      testID={`${marker}_HOST`}
    >
      <Text
        accessibilityLabel={marker}
        accessible
        importantForAccessibility="yes"
        nativeID={marker}
        style={styles.text}
        testID={marker}
      >
        {marker}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 1,
    left: 1,
    zIndex: 9999,
    elevation: 9999,
    width: 180,
    height: 18,
    opacity: 1,
  },
  text: {
    color: "rgba(255,255,255,0.01)",
    fontSize: 4,
    lineHeight: 5,
    width: 180,
    height: 18,
  },
});
