
// app/(tabs)/supplierMap.native.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const UI = {
  bg: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
};

export default function SupplierMapNativeScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Карта поставщиков</Text>
      <Text style={styles.sub}>
        Карта сейчас доступна в веб-версии GOX BUILD.
        Мобильную карту подключим позже.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: UI.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: UI.sub,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
