import React from "react";
import { Keyboard, Modal, Platform, View, Animated, Text, ScrollView } from "react-native";
import DismissKeyboardView from "../../../components/DismissKeyboardView";
import BottomBar from "./BottomBar";
import TopRightActionBar from "../../../ui/TopRightActionBar";
import { Ionicons } from "@expo/vector-icons";

type UiShape = {
  bg: string;
  cardBg: string;
  border: string;
  text: string;
  sub: string;
  btnNeutral?: string;
};

export default function CardModal({
  visible,
  onClose,

  insetsTop,
  insetsBottom,
  kbOpen,
  kbdH,

  ui,

  busyKey,
  isReadOnlyTab,
  canPayUi,

  headerSubtitle,

  onReturnToBuyer,
  onOpenPdf,
  onExcel,
  onPay,
  runAction,

  scrollRef,
  onScroll,
  scrollEventThrottle,
  contentContainerStyle,

  children,
}: {
  visible: boolean;
  onClose: () => void;

  insetsTop: number;
  insetsBottom: number;
  kbOpen: boolean;
  kbdH: number;

  ui: UiShape;

  busyKey: string | null;
  isReadOnlyTab: boolean;
  canPayUi: boolean;

  headerSubtitle: string;

  onReturnToBuyer: () => Promise<void>;
  onOpenPdf: () => Promise<void>;
  onExcel: () => void;
  onPay: () => Promise<void>;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;

  scrollRef: React.Ref<ScrollView>;
  onScroll: (event: unknown) => void;
  scrollEventThrottle: number;
  contentContainerStyle: object;

  children: React.ReactNode;
}) {
  const topPad =
    Platform.OS === "ios" ? Math.max(insetsTop || 0, 44) : (insetsTop || 0);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      onRequestClose={close}
    >
      <DismissKeyboardView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.68)",
          zIndex: 9999,
          elevation: 9999,
        }}
      >
        {/* tap outside */}
        <Animated.View style={{ flex: 1 }} onTouchEnd={close} />

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: ui.bg,
          }}
        >
          <View
            style={{ flex: 1, backgroundColor: ui.bg }}
            onStartShouldSetResponder={
              Platform.OS === "web"
                ? undefined
                : () => {
                    Keyboard.dismiss();
                    return false;
                  }
            }
          >
            <View style={{ height: topPad, backgroundColor: ui.bg }} />

            {/* Header */}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: ui.border,
                backgroundColor: ui.cardBg,
                zIndex: 10,
                elevation: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: ui.text }} numberOfLines={1}>
                    Карточка предложения
                  </Text>
                  <Text style={{ marginTop: 2, color: ui.sub, fontWeight: "700" }} numberOfLines={1}>
                    {headerSubtitle}
                  </Text>
                </View>

                <TopRightActionBar
                  titleLeft=""
                  titleFontSize={14}
                  actions={[
                    {
                      key: "close",
                      icon: "close-outline" as keyof typeof Ionicons.glyphMap,
                      onPress: close,
                      ariaLabel: "Закрыть",
                    },
                  ]}
                  ui={{
                    text: ui.text,
                    sub: ui.sub,
                    border: "rgba(255,255,255,0.14)",
                    btnBg: ui.btnNeutral ?? "rgba(255,255,255,0.06)",
                  }}
                />
              </View>
            </View>

            {/* Body */}
            <Animated.ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[
                { paddingBottom: Math.max(insetsBottom || 0, 16) + 140 + (Platform.OS === "web" ? 0 : kbOpen ? kbdH : 0) },
                contentContainerStyle,
              ]}
            >
              {children}
            </Animated.ScrollView>

            {/* Bottom bar */}
            <BottomBar
              visible={Platform.OS === "web" || !kbOpen}
              insetsBottom={insetsBottom || 0}
              isReadOnlyTab={isReadOnlyTab}
              busyKey={busyKey}
              canPayUi={canPayUi}
              onReturnToBuyer={onReturnToBuyer}
              onOpenPdf={onOpenPdf}
              onExcel={onExcel}
              onPay={onPay}
              runAction={runAction}
            />
          </View>
        </View>
      </DismissKeyboardView>
    </Modal>
  );
}
