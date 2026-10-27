import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type AiScreenRuntimePanelTone = "neutral" | "success" | "warning" | "danger";

export type AiScreenRuntimePanelProps = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: AiScreenRuntimePanelTone;
  evidenceRefs?: readonly string[];
  children?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<AiScreenRuntimePanelTone, StyleProp<ViewStyle>> = {
  neutral: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  success: {
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
  },
  warning: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  danger: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
};

export function AiScreenRuntimePanel({
  title,
  subtitle,
  status,
  tone = "neutral",
  evidenceRefs = [],
  children,
  testID = "ai.screen.runtime.panel",
  style,
}: AiScreenRuntimePanelProps): React.ReactElement {
  return (
    <View testID={testID} style={[styles.root, toneStyles[tone], style]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text testID="ai.screen.runtime.panel.title" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {status ? (
          <View testID="ai.screen.runtime.status" style={styles.statusBadge}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>
      {evidenceRefs.length > 0 ? (
        <View testID="ai.screen.runtime.evidence" style={styles.evidenceRow}>
          {evidenceRefs.slice(0, 3).map((ref) => (
            <Text key={ref} style={styles.evidenceChip} numberOfLines={1}>
              {ref}
            </Text>
          ))}
        </View>
      ) : null}
      {children ? (
        <View testID="ai.screen.runtime.body" style={styles.body}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  subtitle: {
    marginTop: 4,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  statusBadge: {
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  evidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  evidenceChip: {
    maxWidth: "100%",
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  body: {
    gap: 8,
  },
});
