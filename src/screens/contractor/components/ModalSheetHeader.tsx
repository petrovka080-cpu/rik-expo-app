import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  containerStyle?: any;
  titleStyle?: any;
  subtitleStyle?: any;
  closeBtnStyle?: any;
  closeTextStyle?: any;
};

export default function ModalSheetHeader(props: Props) {
  const closeBtnStyle = [
    { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
    props.closeBtnStyle,
  ];

  return (
    <View style={props.containerStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={props.titleStyle}>{props.title}</Text>
        <Pressable hitSlop={10} onPress={props.onClose} style={closeBtnStyle}>
          <Text style={props.closeTextStyle}>✕</Text>
        </Pressable>
      </View>
      {!!props.subtitle && (
        <Text style={props.subtitleStyle} numberOfLines={1}>
          {props.subtitle}
        </Text>
      )}
    </View>
  );
}
