import { router } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import {
  buildAiEstimatePdfConfirmation,
  generateAiEstimatePdf,
} from "../../lib/ai/estimatePdf";
import type { AiEstimatePdfSource } from "../../lib/ai/estimatePdf";
import {
  buildEstimatePresentationRowsFromPdfSource,
  buildEstimatePresentationViewModel,
  formatEstimatePresentationConfidence,
  formatEstimatePresentationMoney,
  getEstimatePresentationQuantityText,
  getEstimatePresentationTotalText,
  getEstimatePresentationUnitPriceText,
  type EstimatePresentationViewModel,
} from "../../lib/ai/estimatePresentation";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import type { AssistantMessage } from "./assistant.types";
import { createAssistantScreenMessage as createMessage } from "./AIAssistantScreen.helpers";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";

type Props = {
  message: AssistantMessage;
  onAppendMessage: (message: AssistantMessage) => void;
  onFallback: (event: string, error: unknown, extra?: Record<string, unknown>) => void;
};

type EstimateTableProps = {
  source: AiEstimatePdfSource;
  presentation?: EstimatePresentationViewModel;
};

const activeEstimatePdfCreations = new Set<string>();

function getEstimatePdfCreationKey(source: AiEstimatePdfSource) {
  return `${source.sourceType}:${source.sourceId ?? source.createdAt}:${source.title}`;
}

async function openEstimatePdfResult(result: ReturnType<typeof generateAiEstimatePdf>) {
  const params = await buildGeneratedPdfViewerRouteParams({
    uri: result.access.uri,
    title: result.title,
    fileName: `${result.pdfId}.pdf`,
    accessKind: result.access.kind,
    documentType: "request",
    originModule: "reports",
    source: "generated",
    entityId: result.pdfId,
  });
  router.push({
    pathname: "/pdf-viewer",
    params,
  });
}

export function AIAssistantEstimatePdfActions({
  message,
  onAppendMessage,
  onFallback,
}: Props) {
  const makeEstimatePdf = useCallback(
    (source: AiEstimatePdfSource) => {
      const confirmation = buildAiEstimatePdfConfirmation(source);
      const createPdf = async () => {
        const creationKey = getEstimatePdfCreationKey(source);
        if (activeEstimatePdfCreations.has(creationKey)) return;
        activeEstimatePdfCreations.add(creationKey);
        try {
          const result = generateAiEstimatePdf({ source, userConfirmed: true });
          onAppendMessage(createMessage("assistant", `PDF создан: ${result.title}`));
          await openEstimatePdfResult(result);
        } catch (error) {
          onFallback("make_estimate_pdf_failed", error, {
            action: "make_estimate_pdf",
            sourceType: source.sourceType,
          });
          onAppendMessage(createMessage("assistant", "Не удалось создать PDF по этой смете. Проверьте строки сметы и попробуйте снова."));
        } finally {
          activeEstimatePdfCreations.delete(creationKey);
        }
      };
      if (Platform.OS === "web") {
        void createPdf();
        return;
      }
      Alert.alert(confirmation.copy.title, confirmation.copy.body, [
        { text: confirmation.copy.cancelLabel, style: "cancel" },
        { text: confirmation.copy.createLabel, onPress: () => { void createPdf(); } },
      ]);
    },
    [onAppendMessage, onFallback],
  );

  if (!message.estimatePdfSource || !message.actions?.length) return null;

  return (
    <View style={styles.estimateActionRow} testID="ai-estimate-actions">
      {message.actions.map((action) => (
        <Pressable
          key={`${message.id}:${action.id}`}
          testID={action.id === "make_estimate_pdf" ? "ai-estimate-make-pdf" : `ai-estimate-action-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.estimateActionButton}
          onPress={() => {
            if (action.id === "make_estimate_pdf" && message.estimatePdfSource) {
              makeEstimatePdf(message.estimatePdfSource);
            }
          }}
        >
          <Text style={styles.estimateActionText} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AIAssistantEstimateTable({ source, presentation }: EstimateTableProps) {
  const viewModel = presentation ?? (source.structuredEstimate ? buildEstimatePresentationViewModel(source.structuredEstimate) : undefined);
  const currency = source.currency ?? source.estimate.totals?.currency ?? viewModel?.totals.currency;
  const rows = viewModel?.rows ?? buildEstimatePresentationRowsFromPdfSource(source);

  if (rows.length === 0) return null;

  return (
    <View style={styles.estimateTableCard} testID="ai-estimate-table">
      <View style={styles.estimateTableHeader}>
        <Text style={styles.estimateTableTitle}>{source.estimate.workTitle}</Text>
        <Text style={styles.estimateTableMeta}>
          {rows.length} строк · {viewModel?.totals.displayGrandTotal ?? formatEstimatePresentationMoney(source.estimate.totals?.grandTotal, currency)}
        </Text>
        {viewModel?.localContext.displayLine ? (
          <Text style={styles.estimateTableMeta} testID="ai-estimate-local-context">
            {viewModel.localContext.displayLine}
          </Text>
        ) : null}
        <Text style={styles.estimateTableMeta} testID="ai-estimate-source-confidence">
          Источники: {viewModel?.sourceLabels[0] ?? rows[0]?.sourceLabel ?? rows[0]?.sourceId} · уверенность: {formatEstimatePresentationConfidence(viewModel?.sourceConfidence ?? rows[0]?.confidence)}
        </Text>
        <Text style={styles.estimateTableMeta} testID="ai-estimate-tax-warning">
          Налог: {viewModel?.tax.taxLabel ?? source.estimate.tax?.label ?? "требует уточнения"}
          {viewModel?.tax.warning ?? source.estimate.tax?.warning ? ` · ${viewModel?.tax.warning ?? source.estimate.tax?.warning}` : ""}
        </Text>
      </View>
      <View style={styles.estimateTableScroller}>
        <View style={styles.estimateTableGrid}>
          <View style={[styles.estimateTableRow, styles.estimateTableHeadRow]}>
            <Text style={[styles.estimateCell, styles.estimateCellNo]}>№</Text>
            <Text style={[styles.estimateCell, styles.estimateCellName]}>Материалы и работы</Text>
            <Text style={[styles.estimateCell, styles.estimateCellQty]}>Кол-во</Text>
            <Text style={[styles.estimateCell, styles.estimateCellMoney]}>Цена</Text>
            <Text style={[styles.estimateCell, styles.estimateCellMoney]}>Итого</Text>
          </View>
          {rows.map((row, index) => (
            <View
              key={`${row.sectionTitle}:${row.rowNumber ?? index}:${row.name}`}
              style={styles.estimateTableRow}
              testID={`ai-estimate-table-row-${index + 1}`}
            >
              <Text style={[styles.estimateCell, styles.estimateCellNo]}>{row.rowNumber ?? index + 1}</Text>
              <View style={[styles.estimateNameCell, styles.estimateCellName]}>
                <Text style={styles.estimateRowName}>{row.name}</Text>
                <Text style={styles.estimateRowSource} numberOfLines={1}>
                  {row.sourceLabel ?? row.sourceEvidence?.[0]?.label ?? row.sourceId ?? row.sectionTitle}
                </Text>
              </View>
              <Text style={[styles.estimateCell, styles.estimateCellQty]}>{getEstimatePresentationQuantityText(row)}</Text>
              <Text style={[styles.estimateCell, styles.estimateCellMoney]}>
                {getEstimatePresentationUnitPriceText(row, currency)}
              </Text>
              <Text style={[styles.estimateCell, styles.estimateCellMoney]}>
                {getEstimatePresentationTotalText(row, currency)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
