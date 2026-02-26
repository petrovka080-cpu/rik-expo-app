// src/screens/director/DirectorFinanceCardModal.tsx
import React, { useEffect, useRef } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  Animated,
  InteractionManager,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import DismissKeyboardView from "../../components/DismissKeyboardView";
import { UI } from "./director.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopRightActionBar from "../../ui/TopRightActionBar";

export default function DirectorFinanceCardModal({
  visible,
  onClose,

  title,
  periodShort,
  loading,

  onOpenPeriod,
  onRefresh,
  onPdf,

  children,
  overlay,
}: {
  visible: boolean;
  onClose: () => void;

  title: string;
  periodShort: string;
  loading?: boolean;

  onOpenPeriod: () => void;
  onRefresh: () => void;
  onPdf: () => Promise<any> | any;

  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const allowBackdropCloseRef = useRef(false);
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      allowBackdropCloseRef.current = false;
      openedAtRef.current = 0;
      return;
    }

    allowBackdropCloseRef.current = false;
    openedAtRef.current = Date.now();

    const task = InteractionManager.runAfterInteractions(() => {
      allowBackdropCloseRef.current = true;
    });

    return () => {
      try {
        // @ts-ignore
        task?.cancel?.();
      } catch { }
    };
  }, [visible]);

  const topPad = Platform.OS === "ios" ? Math.max(insets.top || 0, 44) : insets.top || 0;

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const canBackdropCloseNow = () => {
    if (!allowBackdropCloseRef.current) return false;
    const openedAt = openedAtRef.current || 0;
    if (!openedAt) return false;
    return Date.now() - openedAt >= 450;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      onRequestClose={close}
      onShow={() => {
        if (visible && openedAtRef.current && Date.now() - openedAtRef.current > 700) {
          allowBackdropCloseRef.current = true;
        }
      }}
    >
      <DismissKeyboardView
        pointerEvents="box-none"
        style={{
          flex: 1,
          position: "relative",
          backgroundColor: "rgba(0,0,0,0.68)",
        }}
      >
        <Pressable
          onPress={() => {
            if (!canBackdropCloseNow()) return;
            close();
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: UI.bg,
          }}
          pointerEvents="auto"
        >
          <View style={{ flex: 1, backgroundColor: UI.bg }}>
            <View style={{ height: topPad, backgroundColor: UI.bg }} />

            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: UI.cardBg,
              }}
            >
              <TopRightActionBar
                titleLeft={periodShort || "Весь период"}
                actions={[
                  {
                    key: "period",
                    icon: "calendar-outline",
                    onPress: onOpenPeriod,
                    disabled: !!loading,
                    ariaLabel: "Период",
                  },
                  {
                    key: "refresh",
                    icon: "refresh-outline",
                    onPress: onRefresh,
                    disabled: !!loading,
                    ariaLabel: "Обновить",
                  },
                  {
                    key: "pdf",
                    icon: "document-text-outline",
                    onPress: () => onPdf(),
                    disabled: !!loading,
                    ariaLabel: "PDF",
                  },
                  {
                    key: "close",
                    icon: "close-outline",
                    onPress: close,
                    ariaLabel: "Закрыть",
                  },
                ]}
                ui={{
                  text: UI.text,
                  sub: UI.sub,
                  border: "rgba(255,255,255,0.12)",
                  btnBg: "rgba(255,255,255,0.06)",
                }}
              />

              {loading ? (
                <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12, marginTop: 6 }} numberOfLines={1}>Обновление...</Text>
              ) : null}

              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16, marginTop: 10 }} numberOfLines={1}>
                {title}
              </Text>
            </View>

            {/* No ScrollView wrapper here: child may contain FlatList/SectionList */}
            <Animated.View
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom || 0, 16) + 16,
              }}
            >
              {loading && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(0,0,0,0.05)",
                    zIndex: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{
                    padding: 20,
                    borderRadius: 20,
                    backgroundColor: UI.cardBg,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    gap: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                  }}>
                    <ActivityIndicator size="large" color={UI.text} />
                    <Text style={{ color: UI.text, fontWeight: "800", fontSize: 13 }}>
                      Готовим файл...
                    </Text>
                  </View>
                </View>
              )}
              {children}
            </Animated.View>
          </View>
        </View>

        {overlay ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 99999999,
              // @ts-ignore
              elevation: 99999999,
            }}
          >
            {overlay}
          </View>
        ) : null}
      </DismissKeyboardView>
    </Modal>
  );
}
