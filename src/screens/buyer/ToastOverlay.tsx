import React from "react";
import { Platform, Text, View } from "react-native";

function ToastOverlay({ toast }: { toast: string | null }) {
  if (!toast) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        alignItems: "center",
        zIndex: 999,
        pointerEvents: "box-none",
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: "rgba(16,24,38,0.92)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
          pointerEvents: "none",
          ...Platform.select({
            web: { boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.25)" },
            default: {
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            },
          }),
        }}
      >
        <Text style={{ color: "#E5E7EB", fontWeight: "800", fontSize: 14 }}>
          {toast}
        </Text>
      </View>
    </View>
  );
}

export default React.memo(ToastOverlay);
