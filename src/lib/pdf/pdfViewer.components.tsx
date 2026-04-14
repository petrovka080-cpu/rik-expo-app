/**
 * PDF Viewer presentational components — mechanical extraction (C-REAL-2).
 * Extracted verbatim from app/pdf-viewer.tsx lines 1869-1984.
 * No logic or layout changed.
 */

import React from "react";
import { Platform, Pressable, ScrollView, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  VIEWER_BG,
  VIEWER_BORDER,
  VIEWER_DIM,
  VIEWER_SUBTLE,
  VIEWER_TEXT,
} from "./pdfViewer.constants";
import { styles } from "./pdfViewer.styles";

export function MenuAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction}>
      <Ionicons name={icon} size={18} color={VIEWER_TEXT} />
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return <CenteredPanel title={title} subtitle={subtitle} />;
}

export function CenteredPanel({
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        backgroundColor: VIEWER_BG,
      }}
    >
      <Text
        style={{
          color: VIEWER_TEXT,
          fontSize: 22,
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: VIEWER_SUBTLE,
          fontSize: 14,
          textAlign: "center",
          marginTop: 10,
          maxWidth: 420,
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            marginTop: 18,
            height: 42,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: VIEWER_BORDER,
          }}
        >
          <Text style={{ color: VIEWER_TEXT, fontWeight: "800" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondaryAction ? (
        <Pressable
          onPress={onSecondaryAction}
          style={{
            marginTop: 10,
            height: 42,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: VIEWER_BORDER,
          }}
        >
          <Text style={{ color: VIEWER_TEXT, fontWeight: "800" }}>
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}
      {Platform.OS === "web" ? (
        <Text style={{ color: VIEWER_DIM, fontSize: 12, marginTop: 14 }}>
          Web preview uses in-app iframe rendering.
        </Text>
      ) : null}
    </ScrollView>
  );
}
