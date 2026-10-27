import type { ViewStyle } from "react-native";

/**
 * Central compatibility boundary for CSS properties supported by react-native-web
 * but intentionally absent from React Native's native ViewStyle contract.
 */
export function createReactNativeWebViewStyle(
  properties: Readonly<Record<string, unknown>>,
): ViewStyle {
  const style: ViewStyle = {};
  return Object.assign(style, properties);
}
