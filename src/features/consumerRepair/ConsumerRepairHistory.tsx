import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type {
  ApprovedEstimateHistoryRecord,
  ConsumerRepairApprovedHistoryPage,
  ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import { hasUnhydratedTransactionalConsumerRepairBundles } from "../../lib/consumerRequests/consumerRequestRepository";
import { ConsumerRepairPdfRow } from "./ConsumerRepairPdfRow";
import { buildRequestEstimateViewModel, type RequestEstimateViewModel } from "./requestEstimateViewModel";
import { primaryConsumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";

type Props = {
  revisionHistory: ConsumerRepairDraftBundle[];
  approvedHistoryPage: ConsumerRepairApprovedHistoryPage;
  selectedHistoryId: string | null;
  onOpenPdf: (requestDraftId: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onOpenHistory?: () => void;
  onLoadMoreHistory: () => void;
};

type ApprovedHistoryListItem =
  | { kind: "snapshot"; bundle: ConsumerRepairDraftBundle }
  | { kind: "backend_recovery"; record: ApprovedEstimateHistoryRecord };

const approvedHistoryListKeyExtractor = (item: ApprovedHistoryListItem): string =>
  item.kind === "snapshot" ? item.bundle.draft.id : item.record.approvedEstimateId;

function historyRowCount(bundle: ConsumerRepairDraftBundle): number {
  return bundle.items.length || bundle.durableHistorySummary?.rowCount || 0;
}

export function ConsumerRepairHistory({
  revisionHistory,
  approvedHistoryPage,
  selectedHistoryId,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onSendHistoryToMarket,
  onOpenHistory,
  onLoadMoreHistory,
}: Props): React.ReactElement {
  const [visible, setVisible] = React.useState(false);
  const approvedIds = new Set(
    approvedHistoryPage.records.map((record) => record.approvedEstimateId),
  );
  const compiledDraftHistory = revisionHistory.filter((bundle) =>
    bundle.draft.status === "draft"
    && primaryConsumerRepairCanonicalBackendBinding(bundle) != null
    && historyRowCount(bundle) > 0
    && !approvedIds.has(bundle.draft.id)
  );
  const approvedHistory = [
    ...compiledDraftHistory,
    ...approvedHistoryPage.items,
  ];
  const unresolvedRecords = approvedHistoryPage.unresolvedRecords ?? [];
  const approvedHistoryList: ApprovedHistoryListItem[] = [
    ...approvedHistory.map((bundle): ApprovedHistoryListItem => ({ kind: "snapshot", bundle })),
    ...unresolvedRecords.map((record): ApprovedHistoryListItem => ({ kind: "backend_recovery", record })),
  ];
  const approvedCount = approvedHistoryPage.totalApprovedCount + compiledDraftHistory.length;
  const loadedCount = approvedHistoryList.length;
  const remainingCount = Math.max(approvedCount - loadedCount, 0);
  const hasPendingDurableBundles = hasUnhydratedTransactionalConsumerRepairBundles();
  const hasMore = hasPendingDurableBundles
    || (Boolean(approvedHistoryPage.nextCursorCreatedAt) && loadedCount < approvedCount);
  const selectedApprovedBundle = selectedHistoryId
    ? approvedHistory.find((bundle) => bundle.draft.id === selectedHistoryId) ?? null
    : null;
  const selectedRecoveryRecord = selectedHistoryId
    ? unresolvedRecords.find((record) => record.approvedEstimateId === selectedHistoryId) ?? null
    : null;

  return (
    <View style={styles.entry} testID="consumer-repair-history">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть историю утверждённых смет"
        onPress={() => {
          onOpenHistory?.();
          setVisible(true);
        }}
        style={styles.entryButton}
        testID="consumer-repair-history-button"
      >
        <View style={styles.entryIcon}>
          <Ionicons name="time-outline" size={18} color="#0F172A" />
        </View>
        <View style={styles.entryText}>
          <Text style={styles.entryTitle}>История</Text>
          <Text style={styles.entryMeta} testID="consumer-repair-history-loaded-count">
            Готовые сметы · показано {loadedCount} из {approvedCount}
          </Text>
        </View>
        <View style={styles.badge} testID="consumer-repair-history-approved-count">
          <Text style={styles.badgeText}>{approvedCount}</Text>
        </View>
      </Pressable>
      {selectedApprovedBundle ? (
        <ApprovedHistoryInlineSummary
          bundle={selectedApprovedBundle}
          onOpenPdf={onOpenPdf}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
        />
      ) : null}
      {selectedRecoveryRecord ? (
        <BackendRecoveryHistoryCard
          record={selectedRecoveryRecord}
          expanded
          onOpenPdf={onOpenPdf}
          onEditHistoryDraft={onEditHistoryDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
        />
      ) : null}
      {visible ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setVisible(false)}>
          <View style={styles.overlay} testID="consumer-repair-history-modal">
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.title}>История смет</Text>
                  <Text style={styles.subtitle}>
                    Готовые: {approvedCount} · показано: {loadedCount}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть историю"
                  onPress={() => setVisible(false)}
                  style={styles.closeButton}
                  testID="consumer-repair-history-close"
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>
              <FlatList
                data={approvedHistoryList}
                keyExtractor={approvedHistoryListKeyExtractor}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                style={styles.historyScroller}
                contentContainerStyle={styles.historyList}
                renderItem={({ item }) => item.kind === "snapshot" ? (
                  <>
                    <ConsumerRepairPdfRow
                      bundle={item.bundle}
                      selected={selectedHistoryId === item.bundle.draft.id}
                      onOpenPdf={onOpenPdf}
                      onOpenDraft={onOpenDraft}
                      onToggleHistorySnapshot={onToggleHistorySnapshot}
                    />
                    {selectedHistoryId === item.bundle.draft.id ? (
                      <ApprovedHistorySnapshot
                        bundle={item.bundle}
                        onOpenPdf={onOpenPdf}
                        onEditHistoryDraft={onEditHistoryDraft}
                        onSendHistoryToMarket={onSendHistoryToMarket}
                      />
                    ) : null}
                  </>
                ) : (
                  <BackendRecoveryHistoryCard
                    record={item.record}
                    expanded={selectedHistoryId === item.record.approvedEstimateId}
                    onOpenPdf={onOpenPdf}
                    onEditHistoryDraft={onEditHistoryDraft}
                    onToggleHistorySnapshot={onToggleHistorySnapshot}
                  />
                )}
                ListEmptyComponent={
                  approvedCount === 0 ? (
                    <Text style={styles.empty}>Утверждённых смет пока нет.</Text>
                  ) : null
                }
                ListFooterComponent={
                  hasMore ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={onLoadMoreHistory}
                      style={styles.loadMoreButton}
                      testID="consumer-repair-history-load-more"
                    >
                      <Text style={styles.loadMoreText}>
                        Показать ещё {Math.min(
                          approvedHistoryPage.pageSize,
                          remainingCount || approvedHistoryPage.pageSize,
                        )}
                      </Text>
                    </Pressable>
                  ) : null
                }
                onEndReached={hasMore ? onLoadMoreHistory : undefined}
                onEndReachedThreshold={0.35}
                nestedScrollEnabled
                removeClippedSubviews
                showsVerticalScrollIndicator
                testID="consumer-repair-history-scroll"
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function BackendRecoveryHistoryCard({
  record,
  expanded,
  onOpenPdf,
  onEditHistoryDraft,
  onToggleHistorySnapshot,
}: {
  record: ApprovedEstimateHistoryRecord;
  expanded: boolean;
  onOpenPdf: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
}): React.ReactElement {
  return <View style={styles.snapshot} testID="consumer-repair-history-backend-recovery">
    <Pressable
      accessibilityRole="button"
      onPress={() => onToggleHistorySnapshot(record.approvedEstimateId)}
      testID={`consumer-repair-history-recovery-row-${record.approvedEstimateId}`}
    >
      <Text style={styles.snapshotKicker}>Сохранённая смета доступна для восстановления</Text>
      <Text style={styles.snapshotTitle}>{record.title}</Text>
      <Text style={styles.snapshotMeta}>Можно открыть сохранённую версию без изменения оригинала</Text>
      <Text style={styles.snapshotMeta}>{record.rowCount} позиций · оригинал остаётся неизменным</Text>
    </Pressable>
    {expanded ? <View style={styles.snapshotActions}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onEditHistoryDraft(record.approvedEstimateId)}
        style={styles.primaryActionButton}
        testID="consumer-repair-history-recover-edit-revision"
      >
        <Text style={styles.primaryActionText}>Восстановить и редактировать</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenPdf(record.approvedEstimateId)}
        style={styles.actionButton}
        testID="consumer-repair-history-recover-open-pdf"
      >
        <Text style={styles.actionText}>Скачать PDF</Text>
      </Pressable>
    </View> : null}
  </View>;
}

function ApprovedHistoryInlineSummary({
  bundle,
  onOpenPdf,
  onEditHistoryDraft,
  onSendHistoryToMarket,
}: {
  bundle: ConsumerRepairDraftBundle;
  onOpenPdf: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
}): React.ReactElement | null {
  const viewModel = buildRequestEstimateViewModel(bundle);
  if (!viewModel) return null;
  const canonical = primaryConsumerRepairCanonicalBackendBinding(bundle);
  const previewItems: RequestEstimateViewModel["sections"][number]["items"] = [];
  for (const section of viewModel.sections) {
    for (const item of section.items) {
      if (previewItems.length >= 3) break;
      previewItems.push(item);
    }
    if (previewItems.length >= 3) break;
  }

  return (
    <View style={styles.selectedSummary} testID="consumer-repair-history-selected-summary">
      <View style={styles.selectedHeader}>
        <Text style={styles.selectedKicker}>Утвержденная смета</Text>
        <Text style={styles.selectedTitle} numberOfLines={2}>
          {viewModel.summary || viewModel.title}
        </Text>
        <Text style={styles.selectedMeta}>
          Итого: {viewModel.totalLabel} · {historyRowCount(bundle)} позиций
        </Text>
      </View>
      {canonical ? (
        <View accessible={false} style={styles.identityMarker} testID="consumer-repair-history-selected-release-id" />
      ) : null}
      {previewItems.length > 0 ? (
        <View style={styles.selectedPreview} testID="consumer-repair-history-selected-preview">
          {previewItems.map((item) => (
            <Text
              key={item.id}
              style={styles.selectedPreviewItem}
              numberOfLines={1}
              testID="consumer-repair-history-selected-preview-item"
            >
              {[
                item.titleRu,
                item.quantity,
                formatEstimateUnitLabel(item.unitLabel ?? item.unit),
                item.totalPrice,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.snapshotActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onEditHistoryDraft(bundle.draft.id)}
          style={styles.primaryActionButton}
          testID="consumer-repair-history-edit-revision-inline"
        >
          <Text style={styles.primaryActionText}>Редактировать позиции</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenPdf(bundle.draft.id)}
          style={styles.actionButton}
          testID="consumer-repair-history-open-pdf-inline"
        >
          <Text style={styles.actionText}>PDF</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSendHistoryToMarket(bundle.draft.id)}
          style={styles.actionButton}
          testID="consumer-repair-history-send-market-inline"
        >
          <Text style={styles.actionText}>В маркет</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ApprovedHistorySnapshot({
  bundle,
  onOpenPdf,
  onEditHistoryDraft,
  onSendHistoryToMarket,
}: {
  bundle: ConsumerRepairDraftBundle;
  onOpenPdf: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
}): React.ReactElement | null {
  const viewModel = buildRequestEstimateViewModel(bundle);
  if (!viewModel) return null;
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  const canonical = primaryConsumerRepairCanonicalBackendBinding(bundle);
  const canonicalPdf = bundle.events.find((event) =>
    event.eventType === "consumer_approved_canonical_backend_pdf" &&
    event.payload.revisionId === canonical?.revisionId &&
    event.payload.releaseId === canonical?.releaseId,
  );
  const canonicalProcurement = bundle.events.find((event) =>
    event.eventType === "sent_to_marketplace" &&
    event.payload.canonicalRevisionId === canonical?.revisionId &&
    event.payload.canonicalReleaseId === canonical?.releaseId,
  );

  return (
    <View style={styles.snapshot} testID="consumer-repair-history-readonly-snapshot">
      <Text style={styles.snapshotKicker}>Только просмотр</Text>
      <Text style={styles.snapshotTitle}>{viewModel.summary || viewModel.title}</Text>
      <Text style={styles.snapshotMeta}>Итого: {viewModel.totalLabel}</Text>
      {canonical ? (
        <View accessible={false} style={styles.identityMarker} testID="consumer-repair-history-snapshot-release-id" />
      ) : null}
      {canonicalPdf ? (
        <View accessible={false} style={styles.identityMarker} testID="consumer-repair-history-backend-pdf-artifact" />
      ) : null}
      {canonicalProcurement ? (
        <View accessible={false} style={styles.identityMarker} testID="consumer-repair-history-backend-procurement-artifact" />
      ) : null}
      {latestPdf?.revisionId ? (
        <Text style={styles.snapshotMeta}>PDF готов для этой версии сметы</Text>
      ) : null}
      <View style={styles.snapshotItems}>
        {viewModel.sections.map((section) => (
          <View
            key={section.id}
            style={styles.snapshotSection}
            testID={`consumer-repair-history-section-${section.id}`}
          >
            <Text style={styles.snapshotSectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Text
                key={item.id}
                style={styles.snapshotItem}
                testID="consumer-repair-history-readonly-item"
              >
                {[
                  item.titleRu,
                  item.quantity,
                  formatEstimateUnitLabel(item.unitLabel ?? item.unit),
                  item.totalPrice,
                ]
                  .filter(Boolean)
                  .join(" · ")}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    gap: 8,
  },
  entryButton: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  entryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  entryText: {
    flex: 1,
    minWidth: 0,
  },
  entryTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  entryMeta: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  selectedSummary: {
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedHeader: {
    gap: 3,
  },
  selectedKicker: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  selectedTitle: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  selectedMeta: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  identityMarker: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  selectedPreview: {
    gap: 4,
  },
  selectedPreviewItem: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  sheet: {
    height: "82%",
    maxHeight: "82%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
  },
  sheetHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  historyScroller: {
    flex: 1,
    minHeight: 0,
  },
  historyList: {
    paddingBottom: 16,
  },
  empty: {
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    color: "#64748B",
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 13,
    fontWeight: "800",
  },
  loadMoreButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  loadMoreText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
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
