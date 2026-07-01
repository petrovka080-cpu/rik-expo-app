import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  bottomOffset: number;
  onPress: () => void;
};

export default function AssistantFab({ bottomOffset, onPress }: Props) {
  return (
    <View style={[styles.shell, { bottom: bottomOffset }]}>
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
    pointerEvents: "box-none",
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
    ...Platform.select({
      web: { boxShadow: "0px 8px 16px rgba(15, 23, 42, 0.22)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 7,
      },
    }),
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
