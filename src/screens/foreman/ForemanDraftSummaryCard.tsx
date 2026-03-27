import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  requestLabel?: string | null;
  emptyLabel?: string;
  itemsCount: number;
  syncLabel?: string | null;
  syncDetail?: string | null;
  syncTone?: "neutral" | "info" | "success" | "warning" | "danger";
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  ui: { text: string; sub: string };
  styles: typeof import("./foreman.styles").s;
};

const resolveToneStyle = (tone: Props["syncTone"]) => {
  if (tone === "success") {
    return { bg: "rgba(34,197,94,0.16)", fg: "#86efac" };
  }
  if (tone === "info") {
    return { bg: "rgba(56,189,248,0.16)", fg: "#7dd3fc" };
  }
  if (tone === "warning") {
    return { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d" };
  }
  if (tone === "danger") {
    return { bg: "rgba(248,113,113,0.16)", fg: "#fca5a5" };
  }
  return { bg: "rgba(148,163,184,0.16)", fg: "#cbd5e1" };
};

export default function ForemanDraftSummaryCard({
  requestLabel,
  emptyLabel = "Новый черновик",
  itemsCount,
  syncLabel,
  syncDetail,
  syncTone = "neutral",
  actionLabel = "Позиции",
  actionIcon = "list",
  onPress,
  ui,
  styles,
}: Props) {
  const toneStyle = useMemo(() => resolveToneStyle(syncTone), [syncTone]);
  const displayLabel = String(requestLabel || "").trim() || emptyLabel;
  const itemsLabel = `${itemsCount} позиций`;

  return (
    <Pressable
      onPress={onPress}
      style={styles.draftCard}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      <View style={styles.draftCardBody}>
        <Text style={styles.draftTitle}>Черновик</Text>
        <Text style={styles.draftNo} numberOfLines={1} ellipsizeMode="tail">
          {displayLabel}
        </Text>
        <Text style={styles.draftSummary} numberOfLines={1}>
          {itemsLabel}
        </Text>

        {syncLabel ? (
          <View style={styles.draftMetaRow}>
            <View
              style={[
                styles.draftSyncBadge,
                {
                  backgroundColor: toneStyle.bg,
                },
              ]}
            >
              <Text style={[styles.draftSyncBadgeText, { color: toneStyle.fg }]} numberOfLines={1}>
                {syncLabel}
              </Text>
            </View>
            {syncDetail ? (
              <Text style={styles.draftMetaText} numberOfLines={1} ellipsizeMode="tail">
                {syncDetail}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.draftCardActionColumn}>
        <View style={styles.posPill}>
          <Ionicons name={actionIcon} size={18} color={ui.text} />
          <Text style={styles.posPillText}>{actionLabel}</Text>
          <View style={styles.posCountPill}>
            <Text style={styles.posCountText}>{itemsCount}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
      </View>
    </Pressable>
  );
}
