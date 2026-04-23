import React, { useState } from "react";
import {
  LayoutAnimation,
  Pressable,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PROFILE_UI } from "../profile.helpers";
import { profileInputFocusStyle, profileStyles } from "../profile.styles";

export function MenuActionRow(props: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  testID?: string;
  titleTestID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}) {
  return (
    <Pressable
      testID={props.testID}
      collapsable={!(props.testID || props.titleTestID)}
      accessible={props.accessible}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole={props.accessibilityRole}
      style={[profileStyles.profileMenuRow, props.last && profileStyles.profileMenuRowLast]}
      onPress={props.onPress}
    >
      <View
        style={[
          profileStyles.profileMenuIconWrap,
          props.danger && profileStyles.profileMenuIconWrapDanger,
        ]}
      >
        <Ionicons
          name={props.icon}
          size={18}
          color={props.danger ? "#FCA5A5" : PROFILE_UI.accent}
        />
      </View>
      <View style={profileStyles.profileMenuTextWrap}>
        <Text
          testID={props.titleTestID}
          style={[
            profileStyles.profileMenuTitle,
            props.danger && profileStyles.profileMenuTitleDanger,
          ]}
        >
          {props.title}
        </Text>
        <Text style={profileStyles.profileMenuSubtitle}>{props.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={props.danger ? "#FCA5A5" : PROFILE_UI.sub} />
    </Pressable>
  );
}

export const RowItem = React.memo(function RowItem(props: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[profileStyles.rowItem, props.last && profileStyles.rowItemLast]}>
      <Text style={profileStyles.rowLabel}>{props.label}</Text>
      <Text style={profileStyles.rowValue}>{props.value}</Text>
    </View>
  );
});

export type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  big?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad";
  testID?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  blurOnSubmit?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  textContentType?: TextInputProps["textContentType"];
};

export const LabeledInput = React.forwardRef<TextInput, LabeledInputProps>(
  function LabeledInput(props, forwardedRef) {
    const [focused, setFocused] = useState(false);

    return (
      <View style={profileStyles.labeledInputWrap}>
        <Text style={profileStyles.modalLabel}>{props.label}</Text>
        <TextInput
          ref={forwardedRef}
          testID={props.testID}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={PROFILE_UI.sub}
          style={[
            profileStyles.modalInput,
            props.big && profileStyles.modalInputBig,
            focused && profileInputFocusStyle,
          ]}
          multiline={props.multiline}
          keyboardType={props.keyboardType || "default"}
          returnKeyType={props.returnKeyType}
          onSubmitEditing={props.onSubmitEditing}
          blurOnSubmit={props.blurOnSubmit}
          autoCapitalize={props.autoCapitalize}
          autoCorrect={props.autoCorrect}
          textContentType={props.textContentType}
          onFocus={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFocused(true);
          }}
          onBlur={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFocused(false);
          }}
        />
      </View>
    );
  },
);

LabeledInput.displayName = "LabeledInput";
