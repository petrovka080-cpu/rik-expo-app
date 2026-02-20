import React from "react";
import { Text, View } from "react-native";

export default function ToastOverlay({ toast }: { toast: string | null }) {
  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none" // ✅ контейнер пропускает клики
      style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <View
        pointerEvents="none" // ✅ сам toast не кликабелен
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: "rgba(16,24,38,0.92)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Text style={{ color: "#E5E7EB", fontWeight: "800", fontSize: 14 }}>
          {toast}
        </Text>
      </View>
    </View>
  );
}
