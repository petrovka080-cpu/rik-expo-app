import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";

type Props = {
  bundle: ConsumerRepairDraftBundle;
  onOpenPdf: (requestDraftId: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
};

function formatDate(value: string): string {
  return value.slice(0, 10).split("-").reverse().join(".");
}

export function ConsumerRepairPdfRow({ bundle, onOpenPdf, onOpenDraft }: Props): React.ReactElement {
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  const status = bundle.draft.status === "consumer_approved"
    ? "утверждена"
    : bundle.draft.status === "sent_to_marketplace"
      ? "в маркете"
      : "черновик";

  return (
    <View style={styles.row} testID="consumer-repair-history-row">
      <View style={styles.icon}>
        <Ionicons name={latestPdf ? "document-text" : "create-outline"} size={18} color="#2563EB" />
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{bundle.draft.title || "Ремонт дома"}</Text>
        <Text style={styles.meta}>Статус: {status} · {formatDate(bundle.draft.approvedAt ?? bundle.draft.createdAt)}</Text>
      </View>
      {latestPdf ? (
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
