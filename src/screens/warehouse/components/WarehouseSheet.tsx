// src/screens/warehouse/components/WarehouseSheet.tsx
import React from "react";
import { View, Pressable, Platform, type ViewStyle } from "react-native";
import RNModal from "../../../ui/React19SafeModal";
import { UI } from "../warehouse.styles";

const asWebStyle = (style: Record<string, unknown>) => style as unknown as ViewStyle;

const warnWarehouseSheet = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    console.warn(`[warehouse.sheet] ${scope}:`, message || error);
  }
};

function WebSheet({
  visible,
  onClose,
  children,
  heightPct = 0.88,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightPct?: number;
}) {
  if (!visible) return null;

  const sheetHeight = `${Math.round(heightPct * 100)}%`;
  const handleWheelCapture = (e: { stopPropagation?: () => void }) => {
    try {
      e?.stopPropagation?.();
    } catch (error) {
      warnWarehouseSheet("handleWheelCapture", error);
    }
  };

  return (
    <View
      style={asWebStyle({
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
      })}
      pointerEvents="auto"
    >
      <Pressable
        onPress={onClose}
        style={asWebStyle({
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
        })}
      />

      <View
        {...({ onWheelCapture: handleWheelCapture } as Record<string, unknown>)}
        style={asWebStyle({
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: sheetHeight,
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        })}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.18)",
            marginBottom: 10,
          }}
        />

        <View
          style={asWebStyle({
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          })}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

export default function WarehouseSheet({
  visible,
  onClose,
  children,
  heightPct = 0.88,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightPct?: number;
}) {
  if (Platform.OS === "web") {
    return (
      <WebSheet visible={visible} onClose={onClose} heightPct={heightPct}>
        {children}
      </WebSheet>
    );
  }

  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      avoidKeyboard={false}
      propagateSwipe
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View
        style={{
          height: `${Math.round(heightPct * 100)}%`,
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.18)",
            marginBottom: 10,
          }}
        />

        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      </View>
    </RNModal>
  );
}
