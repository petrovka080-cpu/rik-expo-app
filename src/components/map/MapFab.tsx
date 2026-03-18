import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const UI = {
  card: "rgba(11,17,32,0.92)",
  text: "#F9FAFB",
  border: "#1F2937",
  accent: "#0EA5E9",
};

type Props = {
  onGeo: () => void;
  onReset: () => void;
  onAssistant?: () => void;
};

export default function MapFab({ onGeo, onReset, onAssistant }: Props) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.stack}>
        {onAssistant ? (
          <Pressable onPress={onAssistant} style={[styles.btn, styles.aiBtn]}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </Pressable>
        ) : null}

        <Pressable onPress={onGeo} style={styles.btn}>
          <Ionicons name="locate" size={18} color={UI.text} />
        </Pressable>

        <Pressable onPress={onReset} style={styles.btn}>
          <Text style={styles.resetText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 12,
    bottom: 140,
    gap: 10,
    zIndex: 9999,
    ...(Platform.OS === "android" ? { elevation: 20 } : null),
  },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBtn: {
    backgroundColor: UI.accent,
    borderColor: "#7DD3FC",
  },
  resetText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 22,
  },
});
