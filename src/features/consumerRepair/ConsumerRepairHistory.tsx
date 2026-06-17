import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { ConsumerRepairPdfRow } from "./ConsumerRepairPdfRow";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  history: ConsumerRepairDraftBundle[];
  selectedHistoryId: string | null;
  onOpenPdf: (requestDraftId: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onDuplicateHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
};

export function ConsumerRepairHistory({
  history,
  selectedHistoryId,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onDuplicateHistoryDraft,
  onSendHistoryToMarket,
}: Props): React.ReactElement {
  return (
    <View style={styles.card} testID="consumer-repair-history">
      <Text style={styles.title}>История заявок</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>PDF-заявки появятся здесь после утверждения.</Text>
      ) : (
        history.map((bundle) => (
          <React.Fragment key={bundle.draft.id}>
            <ConsumerRepairPdfRow
              bundle={bundle}
              selected={selectedHistoryId === bundle.draft.id}
              onOpenPdf={onOpenPdf}
              onOpenDraft={onOpenDraft}
              onToggleHistorySnapshot={onToggleHistorySnapshot}
            />
            {selectedHistoryId === bundle.draft.id ? (
              <ApprovedHistorySnapshot
                bundle={bundle}
                onOpenPdf={onOpenPdf}
                onEditHistoryDraft={onEditHistoryDraft}
                onDuplicateHistoryDraft={onDuplicateHistoryDraft}
                onSendHistoryToMarket={onSendHistoryToMarket}
              />
            ) : null}
          </React.Fragment>
        ))
      )}
    </View>
  );
}

function ApprovedHistorySnapshot({
  bundle,
  onOpenPdf,
  onEditHistoryDraft,
  onDuplicateHistoryDraft,
  onSendHistoryToMarket,
}: {
  bundle: ConsumerRepairDraftBundle;
  onOpenPdf: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onDuplicateHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
}): React.ReactElement | null {
  const viewModel = buildRequestEstimateViewModel(bundle);
  if (!viewModel) return null;
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  return (
    <View style={styles.snapshot} testID="consumer-repair-history-readonly-snapshot">
      <Text style={styles.snapshotKicker}>Только просмотр</Text>
      <Text style={styles.snapshotTitle}>{viewModel.summary || viewModel.title}</Text>
      <Text style={styles.snapshotMeta}>Итого: {viewModel.totalLabel}</Text>
      {latestPdf?.revisionId ? (
        <Text style={styles.snapshotMeta}>PDF revision: {latestPdf.revisionId}</Text>
      ) : null}
      <View style={styles.snapshotItems}>
        {viewModel.sections.map((section) => (
          <View key={section.id} style={styles.snapshotSection} testID={`consumer-repair-history-section-${section.id}`}>
            <Text style={styles.snapshotSectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Text key={item.id} style={styles.snapshotItem} testID="consumer-repair-history-readonly-item">
                {[item.titleRu, item.quantity, item.unitLabel ?? item.unit, item.totalPrice].filter(Boolean).join(" · ")}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.snapshotActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onEditHistoryDraft(bundle.draft.id)}
          style={styles.actionButton}
          testID="consumer-repair-history-edit-revision"
        >
          <Text style={styles.actionText}>Редактировать</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenPdf(bundle.draft.id)}
          style={styles.actionButton}
          testID="consumer-repair-history-open-pdf-expanded"
        >
          <Text style={styles.actionText}>PDF</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSendHistoryToMarket(bundle.draft.id)}
          style={styles.primaryActionButton}
          testID="consumer-repair-history-send-market"
        >
          <Text style={styles.primaryActionText}>В маркет</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onDuplicateHistoryDraft(bundle.draft.id)}
          style={styles.actionButton}
          testID="consumer-repair-history-duplicate"
        >
          <Text style={styles.actionText}>Дублировать</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  empty: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  snapshot: {
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  snapshotKicker: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  snapshotTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  snapshotMeta: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  snapshotItems: {
    gap: 8,
  },
  snapshotSection: {
    gap: 4,
  },
  snapshotSectionTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
  },
  snapshotItem: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  snapshotActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primaryActionButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
