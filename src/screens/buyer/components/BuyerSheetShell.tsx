import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import RNModal from "react-native-modal";
import type { StylesBag } from "./component.types";

export const BuyerSheetShell = React.memo(function BuyerSheetShell(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  s: StylesBag;
  children: React.ReactNode;
}) {
  const { isOpen, title, onClose, s, children } = props;

  return (
    <RNModal
      isVisible={isOpen}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      avoidKeyboard={false}
      propagateSwipe
      useNativeDriver={false}
      useNativeDriverForBackdrop={false}
      hideModalContentWhileAnimating={false}
      style={{ margin: 0, justifyContent: "flex-end", alignItems: "stretch" }}
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
    </RNModal>
  );
});
