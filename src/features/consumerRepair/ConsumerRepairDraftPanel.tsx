import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import type { ProjectExecutionDraft } from "../../lib/projectExecution";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { ConsumerRepairProjectExecutionAction } from "./requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddCustom: () => void;
  onRestoreLastRemoved?: () => void;
  canRestoreLastRemoved?: boolean;
  onOpenCatalog?: (itemId: string) => void;
  onProjectExecutionAction?: (action: ConsumerRepairProjectExecutionAction) => void;
};

export function ConsumerRepairDraftPanel({
  bundle,
  showPdfAction,
  onMakePdf,
  onDecrease,
  onIncrease,
  onRemove,
  onAddManual,
  onAddCustom,
  onRestoreLastRemoved,
  canRestoreLastRemoved,
  onOpenCatalog,
  onProjectExecutionAction,
}: Props): React.ReactElement {
  const viewModel = buildRequestEstimateViewModel(bundle);
  const projectDraft = bundle?.projectExecutionDrafts[0] ?? null;
  const projectActionsVisible = Boolean(bundle?.structuredEstimatePayload);
  return (
    <View style={styles.card} testID="consumer-repair-draft">
      <View style={styles.header}>
        <Text style={styles.title}>Черновик</Text>
        <Text style={styles.status}>{bundle ? statusLabel(bundle.draft.status) : "Позиции пока пустые"}</Text>
      </View>

      {bundle ? (
        <View style={styles.requestSection} testID="consumer-repair-draft-request-section">
          <Text style={styles.sectionTitle}>Заявка</Text>
          <Text style={styles.requestText}>{bundle.draft.problemText || bundle.draft.title || "Описание не указано"}</Text>
        </View>
      ) : null}

      {viewModel ? <RequestEstimateSummaryCard viewModel={viewModel} /> : null}

      {viewModel ? (
        <RequestEstimateItemsEditor
          viewModel={viewModel}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onRemove={onRemove}
          onOpenCatalog={onOpenCatalog}
        />
      ) : (
        <Text style={styles.empty}>Опишите задачу или добавьте фото, затем подготовьте черновик.</Text>
      )}

      {bundle && bundle.draft.missingData.length > 0 ? (
        <View style={styles.missing} testID="consumer-repair-missing-data">
          <Text style={styles.sectionTitle}>Что уточнить</Text>
          {bundle.draft.missingData.map((item) => (
            <Text key={item} style={styles.missingItem}>• {item}</Text>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Материал вручную"
        onPress={onAddManual}
        style={styles.manualButton}
        testID="consumer-repair-add-manual-item"
      >
        <Text style={styles.manualText}>Материал вручную</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить примечание к смете"
        onPress={onAddCustom}
        style={styles.manualButton}
        testID="consumer-repair-add-custom-item"
      >
        <Text style={styles.manualText}>Примечание</Text>
      </Pressable>
      {canRestoreLastRemoved && onRestoreLastRemoved ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Восстановить удалённую позицию сметы"
          onPress={onRestoreLastRemoved}
          style={styles.manualButton}
          testID="consumer-repair-restore-item"
        >
          <Text style={styles.manualText}>Вернуть позицию</Text>
        </Pressable>
      ) : null}

      {showPdfAction && onMakePdf ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сделать PDF"
          onPress={onMakePdf}
          style={styles.pdfButton}
          testID="consumer-estimate-make-pdf"
        >
          <Text style={styles.pdfButtonText}>Сделать PDF</Text>
        </Pressable>
      ) : null}

      {projectActionsVisible ? (
        <View style={styles.projectActions} testID="estimate-project-handoff-actions">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442"}
            onPress={() => onProjectExecutionAction?.("create_project")}
            style={styles.projectButton}
            testID="consumer-estimate-create-project"
          >
            <Text style={styles.projectButtonText}>{"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"\u041f\u0435\u0440\u0435\u0434\u0430\u0442\u044c \u0432 \u0437\u0430\u043a\u0443\u043f\u043a\u0443"}
            onPress={() => onProjectExecutionAction?.("send_to_procurement")}
            style={styles.projectButton}
            testID="consumer-estimate-send-procurement"
          >
            <Text style={styles.projectButtonText}>{"\u041f\u0435\u0440\u0435\u0434\u0430\u0442\u044c \u0432 \u0437\u0430\u043a\u0443\u043f\u043a\u0443"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432"}
            onPress={() => onProjectExecutionAction?.("open_material_list")}
            style={styles.projectButton}
            testID="consumer-estimate-open-material-list"
          >
            <Text style={styles.projectButtonText}>{"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432"}</Text>
          </Pressable>
        </View>
      ) : null}

      <ProjectExecutionPreviewPanel draft={projectDraft} />
    </View>
  );
}

function statusLabel(status: ConsumerRepairDraftBundle["draft"]["status"]): string {
  switch (status) {
    case "consumer_approved":
      return "Утверждена · PDF готов";
    case "sent_to_marketplace":
      return "Отправлена в маркет";
    case "cancelled":
      return "Отменена";
    case "archived":
      return "Архив";
    default:
      return "Проверьте данные";
  }
}

function ProjectExecutionPreviewPanel({ draft }: { draft?: ProjectExecutionDraft | null }): React.ReactElement | null {
  if (!draft) return null;
  return (
    <View style={styles.projectPreview} testID="project-execution-preview">
      <Text style={styles.projectPreviewHeading}>{"\u041f\u0440\u043e\u0435\u043a\u0442 \u0432 \u0438\u0441\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435"}</Text>
      <Text style={styles.projectPreviewSubtle}>{draft.customerVisibleTitle}</Text>

      <View style={styles.projectPreviewBlock} testID="project-execution-work-packages">
        <Text style={styles.projectPreviewBlockTitle}>{"\u042d\u0442\u0430\u043f\u044b"}</Text>
        {draft.workPackages.map((workPackage) => (
          <View key={workPackage.id} style={styles.projectPreviewRow}>
            <Text style={styles.projectPreviewRowTitle}>{workPackage.customerVisibleTitle}</Text>
            <Text style={styles.projectPreviewRowMeta}>
              {workPackage.checklist.length} {"\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.projectPreviewBlock} testID="project-execution-tasks">
        <Text style={styles.projectPreviewBlockTitle}>{"\u0417\u0430\u0434\u0430\u0447\u0438"}</Text>
        {draft.tasks.slice(0, 6).map((task) => (
          <View key={task.id} style={styles.projectPreviewRow}>
            <Text style={styles.projectPreviewRowTitle}>{task.title}</Text>
            <Text style={styles.projectPreviewRowMeta}>{[task.quantity, task.unit].filter(Boolean).join(" ")}</Text>
          </View>
        ))}
      </View>

      <View style={styles.projectPreviewBlock} testID="project-execution-procurement-items">
        <Text style={styles.projectPreviewBlockTitle}>{"\u0417\u0430\u043a\u0443\u043f\u043a\u0430"}</Text>
        {draft.procurementItems.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.projectPreviewRow}>
            <Text style={styles.projectPreviewRowTitle}>{item.materialVisibleName}</Text>
            <Text style={styles.projectPreviewRowMeta}>
              {[item.quantity, item.unit, item.priceStatus === "price_required" ? "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430" : "\u043a\u0430\u0442\u0430\u043b\u043e\u0433"].filter(Boolean).join(" - ")}
            </Text>
          </View>
        ))}
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
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  status: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  requestSection: {
    gap: 6,
  },
  requestText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  empty: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  missing: {
    gap: 4,
  },
  missingItem: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  manualButton: {
    minHeight: 38,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  manualText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  pdfButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pdfButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  projectActions: {
    gap: 8,
  },
  projectButton: {
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
  },
  projectButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  projectPreview: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 10,
    paddingTop: 12,
  },
  projectPreviewHeading: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  projectPreviewSubtle: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  projectPreviewBlock: {
    gap: 6,
  },
  projectPreviewBlockTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  projectPreviewRow: {
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  projectPreviewRowTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  projectPreviewRowMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
});
