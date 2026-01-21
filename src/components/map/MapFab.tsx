import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";

const UI = {
  card: "rgba(11,17,32,0.92)",
  text: "#F9FAFB",
  border: "#1F2937",
};

type Props = {
  onGeo: () => void;
  onReset: () => void;
};

export default function MapFab({ onGeo, onReset }: Props) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.stack}>
        <Pressable onPress={onGeo} style={styles.btn}>
          <Text style={styles.icon}>⌖</Text>
        </Pressable>

        <Pressable onPress={onReset} style={styles.btn}>
          <Text style={styles.icon}>⟲</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 12,
    bottom: 140, // над каруселью
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
  icon: { color: UI.text, fontWeight: "900", fontSize: 18 },
});
