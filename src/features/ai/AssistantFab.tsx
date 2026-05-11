import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  bottomOffset: number;
  onPress: () => void;
};

export default function AssistantFab({ bottomOffset, onPress }: Props) {
  return (
    <View pointerEvents="box-none" style={[styles.shell, { bottom: bottomOffset }]}>
      <Pressable
        style={styles.button}
        onPress={onPress}
        accessibilityRole="button"
        testID="ai.assistant.open"
        accessibilityLabel="Открыть AI ассистента"
      >
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        <Text style={styles.label}>AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  button: {
    height: 52,
    minWidth: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
