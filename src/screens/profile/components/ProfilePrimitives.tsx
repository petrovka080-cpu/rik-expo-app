import React, { useState } from "react";
import { LayoutAnimation, Platform, Pressable, Text, TextInput, View } from "react-native";
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
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityLabel={props.accessibilityLabel}
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
        <Text style={[profileStyles.profileMenuTitle, props.danger && profileStyles.profileMenuTitleDanger]}>
          {props.title}
        </Text>
        <Text style={profileStyles.profileMenuSubtitle}>{props.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={props.danger ? "#FCA5A5" : PROFILE_UI.sub} />
    </Pressable>
  );
}

export function RowItem(props: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[profileStyles.rowItem, props.last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={profileStyles.rowLabel}>{props.label}</Text>
      <Text style={profileStyles.rowValue}>{props.value}</Text>
    </View>
  );
}

export type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  big?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad";
  testID?: string;
};

export function LabeledInput(props: LabeledInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={profileStyles.modalLabel}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={PROFILE_UI.sub}
        style={[
          profileStyles.modalInput,
          props.big && { height: 80, textAlignVertical: "top" },
          focused && profileInputFocusStyle,
        ]}
        multiline={props.multiline}
        keyboardType={props.keyboardType || "default"}
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
}

export const inlineGapRow = {
  flexDirection: "row" as const,
  gap: 8,
};

export const inlineFlexOne = {
  flex: 1,
};

export const inlineModalScroll = {
  maxHeight: 430,
};

export const inlineModalScrollContent = {
  paddingBottom: 10,
};

export const inlineCompanyModalScroll = {
  maxHeight: 420,
};

export const inlineHelperText = {
  fontSize: 11,
  color: PROFILE_UI.sub,
};

export const inlineFilterRow = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 6,
  marginBottom: 8,
};

export const inlineCatalogPickerButton = {
  alignSelf: "flex-start" as const,
  marginTop: 6,
};

export const inlineCartSummaryCard = {
  marginTop: 8,
  marginBottom: 8,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: PROFILE_UI.border,
  backgroundColor: PROFILE_UI.cardSoft,
  padding: 8,
};

export const inlineCartItem = {
  paddingVertical: 6,
  borderBottomWidth: 1,
  borderBottomColor: PROFILE_UI.border,
};

export const inlineCartTitle = {
  fontSize: 13,
  color: PROFILE_UI.text,
  fontWeight: "600" as const,
};

export const inlineCartMeta = {
  fontSize: 11,
  color: PROFILE_UI.sub,
};

export const inlinePlatformKeyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag";
