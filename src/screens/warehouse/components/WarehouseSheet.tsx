// src/screens/warehouse/components/WarehouseSheet.tsx
import React from "react";
import { View, Pressable, Platform } from "react-native";
import RNModal from "react-native-modal";
import { UI } from "../warehouse.styles";

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

  return (
    <View
      style={{
        position: "fixed" as any,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      pointerEvents="auto"
    >
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute" as any,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      />

      {/* ✅ сам лист */}
      <View
        // wheel не уходит в фон
        onWheelCapture={(e: any) => {
          try {
            e?.stopPropagation?.();
          } catch {}
        }}
    // @ts-ignore
        style={{
          position: "absolute" as any,
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

          // ✅ важно для скролла внутри
          display: "flex" as any,
          flexDirection: "column" as any,
          minHeight: 0,
          overflow: "hidden" as any, // чтобы скролл был только внутри контента, и скругления норм
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

        {/* ✅ ЭТОТ БЛОК СТАНОВИТСЯ СКРОЛЛ-КОНТЕЙНЕРОМ НА WEB */}
        <View
          style={{
            flex: 1,
            minHeight: 0,
    // @ts-ignore
            overflowY: "auto" as any,
            overflowX: "hidden" as any,
            WebkitOverflowScrolling: "touch" as any,
            overscrollBehavior: "contain" as any,
          }}
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

        {/* на native дети сами могут содержать ScrollView */}
        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      </View>
    </RNModal>
  );
}