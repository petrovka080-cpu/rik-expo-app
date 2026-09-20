import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { primaryConsumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";

type Props = {
  bundle: ConsumerRepairDraftBundle;
  selected: boolean;
  onOpenPdf: (requestDraftId: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
};

function formatDate(value: string): string {
  return value.slice(0, 10).split("-").reverse().join(".");
}

export function ConsumerRepairPdfRow({
  bundle,
  selected,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
}: Props): React.ReactElement {
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  const canonical = primaryConsumerRepairCanonicalBackendBinding(bundle);
  const status = bundle.draft.status === "consumer_approved"
    ? "утверждена"
    : bundle.draft.status === "sent_to_marketplace"
      ? "в маркете"
      : "черновик";
  const openRow = () => {
    if (bundle.draft.status === "draft") {
      onOpenDraft(bundle.draft.id);
      return;
    }
    onToggleHistorySnapshot(bundle.draft.id);
  };

  return (
    <View style={[styles.row, selected ? styles.rowSelected : null]} testID="consumer-repair-history-row">
      <View style={styles.icon}>
        <Ionicons name={latestPdf || canonical ? "document-text" : "create-outline"} size={18} color="#2563EB" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bundle.draft.status === "draft" ? "Открыть черновик" : "Открыть историю заявки"}
        onPress={openRow}
        style={styles.main}
        testID="consumer-repair-history-main"
      >
        <Text style={styles.title} numberOfLines={1}>{bundle.draft.title || "Смета"}</Text>
        <Text style={styles.meta}>Статус: {status} · {formatDate(bundle.draft.approvedAt ?? bundle.draft.createdAt)}</Text>
        {canonical ? (
          <Text
            accessibilityLabel={`Точная версия сметы ${canonical.revisionId}`}
            style={styles.revisionIdentity}
            testID={`consumer-repair-history-revision-${canonical.revisionId}`}
          >
            Версия {canonical.revisionId.slice(0, 8)}
          </Text>
        ) : null}
      </Pressable>
      {canonical ? (
        <View accessible={false} style={styles.canonicalIdentityMarker} testID="consumer-repair-history-release-id" />
      ) : null}
      {latestPdf || canonical ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Открыть PDF"
          onPress={() => onOpenPdf(bundle.draft.id)}
          style={styles.button}
          testID="consumer-repair-history-pdf"
        >
          <Text style={styles.buttonText}>PDF</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Открыть черновик"
          onPress={() => onOpenDraft(bundle.draft.id)}
          style={styles.button}
          testID="consumer-repair-history-open"
        >
          <Text style={styles.buttonText}>Открыть</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  rowSelected: {
    borderBottomColor: "#93C5FD",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  canonicalIdentityMarker: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  meta: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  revisionIdentity: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  button: {
    minHeight: 34,
    minWidth: 66,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
