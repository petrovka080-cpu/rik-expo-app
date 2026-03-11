import React from "react";
import { Modal, Platform, Pressable, Text, View, type ViewStyle } from "react-native";

import type { StylesBag } from "./component.types";

function WebSheet(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  s: StylesBag;
  children: React.ReactNode;
}) {
  const { isOpen, title, onClose, s, children } = props;
  if (!isOpen) return null;

  return (
    <View
      style={
        {
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 9999,
        } as unknown as ViewStyle
      }
      pointerEvents="auto"
    >
      <Pressable
        onPress={onClose}
        style={
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
          } as unknown as ViewStyle
        }
      />

      <View
        style={
          {
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            height: "88%",
            minHeight: 0,
            overflow: "hidden",
          } as unknown as ViewStyle
        }
      >
        <View style={s.dirSheet}>
          <View style={s.dirSheetHandle} />

          <View style={s.dirSheetTopBar}>
            <Text style={s.dirSheetTitle} numberOfLines={1}>
              {title}
            </Text>

            <Pressable onPress={onClose} style={s.dirSheetCloseBtn} hitSlop={10}>
              <Text style={s.dirSheetCloseText}>Свернуть</Text>
            </Pressable>
          </View>

          {children}
        </View>
      </View>
    </View>
  );
}

export const BuyerSheetShell = React.memo(function BuyerSheetShell(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  s: StylesBag;
  children: React.ReactNode;
}) {
  const { isOpen, title, onClose, s, children } = props;

  if (Platform.OS === "web") {
    return (
      <WebSheet isOpen={isOpen} title={title} onClose={onClose} s={s}>
        {children}
      </WebSheet>
    );
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <View style={[s.dirSheet, { maxHeight: "88%" }]}>
          <View style={s.dirSheetHandle} />

          <View style={s.dirSheetTopBar}>
            <Text style={s.dirSheetTitle} numberOfLines={1}>
              {title}
            </Text>

            <Pressable onPress={onClose} style={s.dirSheetCloseBtn} hitSlop={10}>
              <Text style={s.dirSheetCloseText}>Свернуть</Text>
            </Pressable>
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
});
