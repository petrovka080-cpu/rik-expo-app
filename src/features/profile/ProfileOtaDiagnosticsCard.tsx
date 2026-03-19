import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { checkAndFetchOtaNow } from "@/src/lib/otaHardening";
import { buildOtaDiagnosticsText, getOtaDiagnostics, type OtaDiagnostics } from "@/src/lib/otaDiagnostics";

const UI = {
  card: "#0F172A",
  cardSoft: "#020617",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "#1F2937",
  button: "#22C55E",
  buttonText: "#052E16",
  secondaryButton: "#111827",
};

type RowProps = {
  label: string;
  value: string;
  last?: boolean;
};

function getSeverityTheme(severity: OtaDiagnostics["severity"]) {
  switch (severity) {
    case "error":
      return {
        icon: "alert-circle-outline" as const,
        border: "#DC2626",
        badgeBg: "rgba(220,38,38,0.14)",
        cardBg: "rgba(127,29,29,0.16)",
        text: "#FCA5A5",
      };
    case "warning":
      return {
        icon: "warning-outline" as const,
        border: "#D97706",
        badgeBg: "rgba(217,119,6,0.14)",
        cardBg: "rgba(146,64,14,0.16)",
        text: "#FCD34D",
      };
    default:
      return {
        icon: "checkmark-circle-outline" as const,
        border: "#22C55E",
        badgeBg: "rgba(34,197,94,0.14)",
        cardBg: "rgba(21,128,61,0.14)",
        text: "#86EFAC",
      };
  }
}

function DiagnosticsRow({ label, value, last }: RowProps) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function BlockTitle({ title }: { title: string }) {
  return <Text style={styles.blockTitle}>{title}</Text>;
}

function BulletList(props: { items: string[]; emptyLabel: string }) {
  if (!props.items.length) {
    return <Text style={styles.listItem}>• {props.emptyLabel}</Text>;
  }

  return (
    <>
      {props.items.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </>
  );
}

export function ProfileOtaDiagnosticsCard() {
  const [loading, setLoading] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState("");

  const diagnostics = getOtaDiagnostics();
  const severityTheme = getSeverityTheme(diagnostics.severity);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(buildOtaDiagnosticsText(diagnostics));
      setLastActionMessage("Диагностика скопирована.");
      Alert.alert("OTA diagnostics", "Диагностика скопирована.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastActionMessage(message);
      Alert.alert("OTA diagnostics", message);
    }
  };

  const handleCheckNow = async () => {
    setLoading(true);
    setLastActionMessage("");

    try {
      const result = await checkAndFetchOtaNow();
      const message = result.error ? `${result.message}\n\n${result.error}` : result.message;

      setLastActionMessage(message);
      Alert.alert("OTA diagnostics", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={[styles.card, { borderColor: severityTheme.border }]}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Ionicons name={severityTheme.icon} size={18} color={severityTheme.text} />
            <Text style={styles.headerTitle}>OTA diagnostics</Text>
          </View>
          <View style={[styles.badge, { borderColor: severityTheme.border, backgroundColor: severityTheme.badgeBg }]}>
            <Text style={[styles.badgeText, { color: severityTheme.text }]}>
              {diagnostics.severity.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <DiagnosticsRow label="Channel" value={diagnostics.channel} />
          <DiagnosticsRow label="Expected branch" value={diagnostics.expectedBranch} />
          <DiagnosticsRow label="Runtime" value={diagnostics.runtimeVersion} />
          <DiagnosticsRow label="Update ID" value={diagnostics.updateId} />
          <DiagnosticsRow label="Embedded launch" value={diagnostics.isEmbeddedLaunch ? "yes" : "no"} />
          <DiagnosticsRow label="Created at" value={diagnostics.createdAt} />
          <DiagnosticsRow
            label="Last update age"
            value={
              diagnostics.lastUpdateAgeHours == null
                ? "unknown"
                : `${Math.floor(diagnostics.lastUpdateAgeHours)} h`
            }
          />
          <DiagnosticsRow label="App version" value={diagnostics.nativeAppVersion} />
          <DiagnosticsRow label="Build" value={diagnostics.nativeBuildVersion} />
          <DiagnosticsRow label="Outdated" value={diagnostics.isProbablyOutdated ? "yes" : "no"} />
          <DiagnosticsRow label="Project ID" value={diagnostics.projectId} />
          <DiagnosticsRow label="Updates URL" value={diagnostics.updatesUrl} last />
        </View>

        <View style={[styles.callout, { borderColor: severityTheme.border, backgroundColor: severityTheme.cardBg }]}>
          <Text style={[styles.calloutText, { color: severityTheme.text }]}>
            {diagnostics.publishHint}
          </Text>
        </View>

        <BlockTitle title="Проблемы" />
        <BulletList items={diagnostics.issues} emptyLabel="Проблем не найдено." />

        <BlockTitle title="Что делать" />
        <BulletList items={diagnostics.actions} emptyLabel="Дополнительных действий не требуется." />

        <View style={styles.runbookCard}>
          <Text style={styles.runbookTitle}>Release runbook</Text>
          <Text style={styles.runbookText}>1. iPhone / TestFlight: publish only to production.</Text>
          <Text style={styles.runbookText}>2. Android preview APK: publish only to preview.</Text>
          <Text style={styles.runbookText}>
            3. После OTA: полностью закройте приложение, откройте его, снова закройте и откройте еще раз.
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleCheckNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={UI.buttonText} />
            ) : (
              <Text style={styles.primaryButtonText}>Проверить OTA сейчас</Text>
            )}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleCopy} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Скопировать диагностику</Text>
          </Pressable>
        </View>

        {!!lastActionMessage && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{lastActionMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  grid: {
    backgroundColor: UI.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    color: UI.sub,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  rowValue: {
    marginTop: 3,
    color: UI.text,
    fontSize: 13,
  },
  callout: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  calloutText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  blockTitle: {
    marginTop: 12,
    marginBottom: 6,
    color: UI.text,
    fontSize: 13,
    fontWeight: "700",
  },
  listItem: {
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  runbookCard: {
    marginTop: 12,
    backgroundColor: UI.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  runbookTitle: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "700",
  },
  runbookText: {
    marginTop: 6,
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: UI.button,
  },
  primaryButtonText: {
    color: UI.buttonText,
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: UI.secondaryButton,
    borderWidth: 1,
    borderColor: UI.border,
  },
  secondaryButtonText: {
    color: UI.text,
    fontSize: 12,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  messageBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    color: UI.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
