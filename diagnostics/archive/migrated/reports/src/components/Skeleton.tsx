import React from "react";
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({
  width = "100%",
  height = 16,
  style,
}: SkeletonProps) {
  return <View style={[styles.base, { width, height }, style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#334155",
    borderRadius: 8,
  },
});
