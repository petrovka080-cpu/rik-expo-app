import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const ROUTE_PROOF_MARKERS = {
  appRoot: "ROUTE_PROOF_APP_ROOT_READY",
  authenticatedSession: "ROUTE_PROOF_AUTHENTICATED_SESSION_READY",
  request: "ROUTE_PROOF_REQUEST_ROUTE_READY",
  embeddedAi: "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY",
} as const;

export type RouteProofMarker = (typeof ROUTE_PROOF_MARKERS)[keyof typeof ROUTE_PROOF_MARKERS];
export type RequestEstimateLaunchProofMarker =
  `REQUEST_ESTIMATE_LAUNCH_READY_${string}`;

export function RouteReadyMarker({
  marker,
}: {
  marker: RouteProofMarker | RequestEstimateLaunchProofMarker;
}) {
  if (!__DEV__) return null;

  return (
    <View
      accessibilityLabel={`${marker}_HOST`}
      accessible
      collapsable={false}
      importantForAccessibility="yes"
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
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  text: {
    color: "transparent",
    fontSize: 1,
    lineHeight: 1,
    width: 1,
    height: 1,
  },
});
