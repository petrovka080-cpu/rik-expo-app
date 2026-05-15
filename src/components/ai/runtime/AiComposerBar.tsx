import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

export type AiComposerBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder?: string;
  disabled?: boolean;
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "multiline">;
  style?: StyleProp<ViewStyle>;
};

export function AiComposerBar({
  value,
  onChangeText,
  onSend,
  loading,
  placeholder = "Ask AI",
  disabled = false,
  inputProps,
  style,
}: AiComposerBarProps): React.ReactElement {
  const trimmedValue = value.trim();
  const sendDisabled = disabled || loading || trimmedValue.length === 0;

  return (
    <View testID="ai.screen.composer" style={[styles.root, style]}>
      <TextInput
        {...inputProps}
        testID="ai.screen.composer.input"
        accessibilityLabel="ai.screen.composer.input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        multiline
        style={styles.input}
      />
      <View testID="ai.screen.composer.loading" style={styles.loadingSlot}>
        {loading ? <ActivityIndicator size="small" color="#0F766E" /> : null}
      </View>
      <Pressable
        testID="ai.screen.composer.send"
        accessibilityRole="button"
        accessibilityLabel="ai.screen.composer.send"
        accessibilityState={{ disabled: sendDisabled, busy: loading }}
        disabled={sendDisabled}
        onPress={onSend}
        style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
      >
        <Text style={styles.sendText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 108,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 19,
  },
  loadingSlot: {
    width: 28,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    minWidth: 64,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
});
