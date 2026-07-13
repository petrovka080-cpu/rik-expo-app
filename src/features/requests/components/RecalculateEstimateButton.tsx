import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export function RecalculateEstimateButton({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress?: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null]}
      testID="recalculate-estimate-button"
    >
      <Text style={styles.text}>Пересчитать</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
