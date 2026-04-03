import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useUpdates } from "expo-updates";

import { checkAndFetchOtaNow } from "@/src/lib/otaHardening";
import { buildOtaDiagnosticsText, getOtaDiagnostics, type OtaDiagnostics } from "@/src/lib/otaDiagnostics";
import { buildPdfCrashBreadcrumbsText, getPdfCrashBreadcrumbs } from "@/src/lib/pdf/pdfCrashBreadcrumbs";

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

function shouldUseSafeOtaInstructions(diagnostics: OtaDiagnostics): boolean {
  return diagnostics.channel === "production" || diagnostics.channel === "preview";
}

function buildSafeOtaInstructionsMessage(diagnostics: OtaDiagnostics): string {
  return [
    "В этом release-билде ручная OTA-проверка отключена, чтобы не выбрасывать приложение.",
    `Канал: ${diagnostics.channel}`,
    `Runtime: ${diagnostics.runtimeVersion}`,
    `Build: ${diagnostics.nativeBuildVersion}`,
    "",
    "Что делать:",
    "1. Откройте приложение на интернете и подождите 20-30 секунд.",
    "2. Полностью закройте приложение.",
    "3. Откройте его снова и подождите 20-30 секунд.",
    "4. Полностью закройте и откройте еще раз.",
    "",
    "Если обновление все еще не применилось, скопируйте OTA diagnostics и пришлите их.",
  ].join("\n");
}

function BulletList(props: { items: string[]; emptyLabel: string }) {
  if (!props.items.length) {
    return <Text style={styles.listItem}>- {props.emptyLabel}</Text>;
  }

  return (
    <>
      {props.items.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.listItem}>
          - {item}
        </Text>
      ))}
    </>
  );
}

export function ProfileOtaDiagnosticsCard() {
  const [loading, setLoading] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState("");

  const updatesState = useUpdates();
  const diagnostics = getOtaDiagnostics(updatesState);
  const severityTheme = getSeverityTheme(diagnostics.severity);
  const useSafeOtaInstructions = shouldUseSafeOtaInstructions(diagnostics);
  const primaryButtonLabel = useSafeOtaInstructions ? "Показать шаги OTA" : "Проверить OTA сейчас";

  const handleCopy = async () => {
    try {
      const breadcrumbs = await getPdfCrashBreadcrumbs();
      const payload = buildOtaDiagnosticsText(diagnostics)
        + (breadcrumbs.length
          ? `\n\npdf_crash_breadcrumbs:\n${buildPdfCrashBreadcrumbsText(breadcrumbs)}`
          : "\n\npdf_crash_breadcrumbs:\n- none");
      await Clipboard.setStringAsync(payload);
      setLastActionMessage("Диагностика скопирована.");
      Alert.alert("OTA diagnostics", "Диагностика скопирована.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastActionMessage(message);
      Alert.alert("OTA diagnostics", message);
    }
  };

  const handleCheckNow = async () => {
    setLastActionMessage("");

    if (useSafeOtaInstructions) {
      const message = buildSafeOtaInstructionsMessage(diagnostics);
      setLastActionMessage(message);
      Alert.alert("OTA diagnostics", message);
      return;
    }

    setLoading(true);

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
          <DiagnosticsRow label="Launch source" value={diagnostics.launchSource} />
          <DiagnosticsRow label="Created at" value={diagnostics.createdAt} />
          <DiagnosticsRow
            label="Last update age"
            value={
              diagnostics.lastUpdateAgeHours == null
                ? "unknown"
                : `${Math.floor(diagnostics.lastUpdateAgeHours)} h`
            }
          />
          <DiagnosticsRow label="Update availability" value={diagnostics.updateAvailabilitySummary} />
          <DiagnosticsRow label="Last check" value={diagnostics.lastCheckForUpdateTimeSinceRestart} />
          <DiagnosticsRow label="App version" value={diagnostics.nativeAppVersion} />
          <DiagnosticsRow label="Build" value={diagnostics.nativeBuildVersion} />
          <DiagnosticsRow label="Configured iOS build" value={diagnostics.configuredIosBuildNumber} />
          <DiagnosticsRow label="Configured Android code" value={diagnostics.configuredAndroidVersionCode} />
          <DiagnosticsRow label="App version source" value={diagnostics.appVersionSource} />
          <DiagnosticsRow label="Check automatically" value={diagnostics.checkAutomatically} />
          <DiagnosticsRow
            label="Fallback timeout"
            value={
              diagnostics.fallbackToCacheTimeout == null
                ? "unknown"
                : `${diagnostics.fallbackToCacheTimeout} ms`
            }
          />
          <DiagnosticsRow label="Release label" value={diagnostics.releaseLabel} />
          <DiagnosticsRow label="Git commit" value={diagnostics.gitCommit} />
          <DiagnosticsRow label="Update group" value={diagnostics.updateGroupId} />
          <DiagnosticsRow label="Update message" value={diagnostics.updateMessage} />
          <DiagnosticsRow label="Metadata source" value={diagnostics.metadataSource} />
          <DiagnosticsRow label="Emergency launch" value={diagnostics.isEmergencyLaunch ? "yes" : "no"} />
          <DiagnosticsRow label="Outdated" value={diagnostics.isProbablyOutdated ? "yes" : "no"} />
          <DiagnosticsRow label="Project ID" value={diagnostics.projectId} />
          <DiagnosticsRow label="Updates URL" value={diagnostics.updatesUrl} last />
        </View>

        <View style={[styles.callout, { borderColor: severityTheme.border, backgroundColor: severityTheme.cardBg }]}>
          <Text style={[styles.calloutText, { color: severityTheme.text }]}>
            {diagnostics.publishHint}
          </Text>
        </View>

        <BlockTitle title="Reasons" />
        <BulletList items={diagnostics.reasons} emptyLabel="No lineage risks detected." />

        <BlockTitle title="Actions" />
        <BulletList items={diagnostics.actions} emptyLabel="No follow-up action required." />

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
            testID="ota-check-action"
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleCheckNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={UI.buttonText} />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
            )}
          </Pressable>

          <Pressable testID="ota-copy-action" style={styles.secondaryButton} onPress={handleCopy} disabled={loading}>
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
