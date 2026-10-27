import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MARKET_HOME_COLORS } from "../marketHome.config";

type Props = {
  visible: boolean;
  supplierName: string;
  message: string;
  busy: boolean;
  errorText: string | null;
  onChangeMessage: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function MarketContactSupplierModal({
  visible,
  supplierName,
  message,
  busy,
  errorText,
  onChangeMessage,
  onClose,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const disabled = busy || !message.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Связаться с поставщиком</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {supplierName || "Поставщик"}
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={busy ? undefined : onClose}
              disabled={busy}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.helper}>
            Сообщение сохранится как обращение к поставщику. Ответный чат здесь пока не нужен.
          </Text>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={onChangeMessage}
            placeholder="Напишите, что нужно уточнить по товару или поставке"
            placeholderTextColor="#94A3B8"
            multiline
            editable={!busy}
            textAlignVertical="top"
            maxLength={2000}
          />

          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.primaryButton, disabled ? styles.disabledButton : null]}
              onPress={onSubmit}
              disabled={disabled}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Отправить</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "700",
  },
  helper: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  input: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: MARKET_HOME_COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  secondaryButtonText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "800",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
