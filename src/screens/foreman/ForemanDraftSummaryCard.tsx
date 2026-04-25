import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import type { ForemanDraftVisualModel } from "./foremanDraftVisualState";

type Props = {
  model: ForemanDraftVisualModel;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  onPress: () => void;
  ui: { text: string; sub: string };
  styles: typeof import("./foreman.styles").s;
};

const resolveToneStyle = (tone: ForemanDraftVisualModel["tone"]) => {
  if (tone === "success") {
    return { bg: "rgba(34,197,94,0.16)", fg: "#86efac", border: "rgba(34,197,94,0.28)" };
  }
  if (tone === "info") {
    return { bg: "rgba(56,189,248,0.14)", fg: "#7dd3fc", border: "rgba(56,189,248,0.28)" };
  }
  if (tone === "warning") {
    return { bg: "rgba(245,158,11,0.14)", fg: "#fcd34d", border: "rgba(245,158,11,0.28)" };
  }
  if (tone === "danger") {
    return { bg: "rgba(248,113,113,0.14)", fg: "#fca5a5", border: "rgba(248,113,113,0.28)" };
  }
  return { bg: "rgba(148,163,184,0.14)", fg: "#cbd5e1", border: "rgba(148,163,184,0.24)" };
};

export default function ForemanDraftSummaryCard({
  model,
  actionLabel = "Позиции",
  actionIcon = "list",
  disabled = false,
  onPress,
  ui,
  styles,
}: Props) {
  const toneStyle = useMemo(() => resolveToneStyle(model.tone), [model.tone]);

  return (
    <Pressable
      testID="foreman-draft-open"
      accessibilityLabel="foreman-draft-open"
      onPress={onPress}
      disabled={disabled}
      style={[styles.draftCard, disabled && styles.draftCardDisabled]}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      <View style={styles.draftCardTopRow}>
        <Text style={styles.draftTitle}>Черновик</Text>

        <View style={styles.draftCardActionColumn}>
          <View style={styles.posPill}>
            <Ionicons name={actionIcon} size={16} color={ui.text} />
            <Text style={styles.posPillText}>{actionLabel}</Text>
            <View style={styles.posCountPill}>
              <Text style={styles.posCountText}>{model.count}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.48)" />
        </View>
      </View>

      <View style={styles.draftCardBody}>
        <Text
          style={styles.draftNo}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.9}
        >
          {model.requestLabel}
        </Text>

        <View style={styles.draftMetaRow}>
          <Text style={styles.draftSummary} numberOfLines={1}>
            {model.itemsLabel}
          </Text>
          <Text style={styles.draftMetaDivider}>•</Text>
          <View
            style={[
              styles.draftStatusPill,
              {
                backgroundColor: toneStyle.bg,
                borderColor: toneStyle.border,
              },
            ]}
          >
            <Text
              style={[styles.draftStatusPillText, { color: toneStyle.fg }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {model.statusLabel}
            </Text>
          </View>
        </View>

        {model.helperText ? (
          <Text style={styles.draftHelperText} numberOfLines={2} ellipsizeMode="tail">
            {model.helperText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
