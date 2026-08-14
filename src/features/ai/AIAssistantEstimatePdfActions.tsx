import React, { useCallback } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import type { AiEstimatePdfSource } from "../../lib/ai/estimatePdf/estimatePdfTypes";
import {
  buildEstimatePresentationRowsFromPdfSource,
  formatEstimatePresentationConfidence,
  formatEstimatePresentationMoney,
  getEstimatePresentationQuantityText,
  getEstimatePresentationTotalText,
  getEstimatePresentationUnitPriceText,
  type EstimatePresentationViewModel,
} from "../../lib/ai/estimatePresentation";
import { buildEstimatePresentationViewModel } from "../../lib/estimateStructuredPipeline/buildEstimatePresentationViewModel";
import { buildStructuredEstimatePayload } from "../../lib/estimateStructuredPipeline/buildStructuredEstimatePayload";
import type { AssistantMessage } from "./assistant.types";
import { createAssistantScreenMessage as createMessage } from "./AIAssistantScreen.helpers";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";
import { buildCanonicalEstimateArtifact } from "../../lib/estimate/backendPlatform/canonicalEstimateClient";

type Props = {
  message: AssistantMessage;
  onAppendMessage: (message: AssistantMessage) => void;
  onFallback: (event: string, error: unknown, extra?: Record<string, unknown>) => void;
};

type EstimateTableProps = {
  source: AiEstimatePdfSource;
  presentation?: EstimatePresentationViewModel;
};

function buildEstimateActionProofText(source: AiEstimatePdfSource, presentation?: EstimatePresentationViewModel): string {
  const viewModel = presentation ?? (source.structuredEstimate
    ? buildEstimatePresentationViewModel(buildStructuredEstimatePayload(source.structuredEstimate, { source: "foreman" }))
    : undefined);
  const currency = source.currency ?? source.estimate.totals?.currency ?? viewModel?.totals.currency;
  const rows = viewModel?.rows ?? buildEstimatePresentationRowsFromPdfSource(source);
  if (rows.length === 0) return "";
  const sourceLabel = viewModel?.sourceLabels[0] ?? rows[0]?.sourceLabel ?? rows[0]?.sourceEvidence?.[0]?.label ?? rows[0]?.sourceId;
  const confidence = formatEstimatePresentationConfidence(viewModel?.sourceConfidence ?? rows[0]?.confidence);
  const tax = viewModel?.tax.taxLabel ?? source.estimate.tax?.label ?? "требует уточнения";
  const rowLines = rows.slice(0, 8).map((row) =>
    [
      row.name,
      getEstimatePresentationQuantityText(row),
      getEstimatePresentationUnitPriceText(row, currency),
      getEstimatePresentationTotalText(row, currency),
      `Источник: ${row.sourceLabel ?? row.sourceEvidence?.[0]?.label ?? row.sourceId}`,
      `уверенность: ${formatEstimatePresentationConfidence(row.confidence)}`,
    ].join(" · "),
  );
  return [
    `Источник: ${sourceLabel} · уверенность: ${confidence} · Налог: ${tax}`,
    ...rowLines,
  ].join("\n");
}

function buildEstimateActionFooterProofText(source: AiEstimatePdfSource, presentation?: EstimatePresentationViewModel): string {
  const unitAliases = new Set<string>();
  for (const section of source.estimate.sections) {
    for (const row of section.rows) {
      const unit = String(row.unit ?? "").trim();
      if (!unit) continue;
      if (unit === "sq_m" || unit === "m2" || unit === "м²") {
        unitAliases.add("м² / м2");
      } else if (unit === "linear_m") {
        unitAliases.add("пог. м");
      } else if (unit === "pcs" || unit === "piece") {
        unitAliases.add("шт.");
      } else if (unit === "m3" || unit === "м³") {
        unitAliases.add("м³ / м3");
      } else {
        unitAliases.add(unit);
      }
    }
  }
  const proofLines = buildEstimateActionProofText(source, presentation)
    .split(/\r?\n/)
    .filter(Boolean);
  return [
    source.estimate.description ? `Запрос: ${source.estimate.description}` : "",
    `Работа: ${source.estimate.workTitle}`,
    unitAliases.size > 0 ? `Единицы: ${[...unitAliases].join(", ")}` : "",
    ...proofLines.slice(0, 2),
  ].filter(Boolean).join("\n");
}

export function AIAssistantEstimatePdfActions({
  message,
  onAppendMessage,
  onFallback,
}: Props) {
  const makeCanonicalArtifact = useCallback(async (kind: "pdf" | "procurement") => {
    if (!message.canonicalEstimateRevisionId || !message.canonicalEstimateReleaseId) return;
    try {
      const artifact = await buildCanonicalEstimateArtifact({
        revisionId: message.canonicalEstimateRevisionId,
        kind,
        idempotencyKey: `ai-${kind}-${message.canonicalEstimateRevisionId}`,
      });
      if (artifact.releaseId !== message.canonicalEstimateReleaseId) throw new Error("CANONICAL_ARTIFACT_RELEASE_MISMATCH");
      onAppendMessage(createMessage("assistant", `${kind.toUpperCase()}: revision ${artifact.revisionId}, release ${artifact.releaseId}.`));
      if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl);
    } catch (error) {
      onFallback(`canonical_${kind}_failed`, error, { revisionId: message.canonicalEstimateRevisionId });
    }
  }, [message.canonicalEstimateReleaseId, message.canonicalEstimateRevisionId, onAppendMessage, onFallback]);
  if (message.canonicalEstimateRevisionId && message.canonicalEstimateReleaseId) return (
    <View collapsable={false} style={styles.estimateActionBlock} testID="ai-canonical-estimate-actions">
      <Text style={styles.estimateActionProof}>revision {message.canonicalEstimateRevisionId} · release {message.canonicalEstimateReleaseId}</Text>
      <View style={styles.estimateActionRow}>
        <Pressable onPress={() => void makeCanonicalArtifact("pdf")} style={styles.estimateActionButton}><Text style={styles.estimateActionText}>PDF</Text></Pressable>
        <Pressable onPress={() => void makeCanonicalArtifact("procurement")} style={styles.estimateActionButton}><Text style={styles.estimateActionText}>Закупка</Text></Pressable>
      </View>
    </View>
  );
  if (!message.estimatePdfSource || !message.actions?.length) return null;
  const proofText = buildEstimateActionProofText(message.estimatePdfSource, message.estimatePresentation);
  const footerProofText = buildEstimateActionFooterProofText(message.estimatePdfSource, message.estimatePresentation);

  return (
    <View collapsable={false} style={styles.estimateActionBlock} testID="ai-estimate-actions">
      {proofText ? (
        <Text
          accessible
          accessibilityLabel={proofText}
          style={styles.estimateActionProof}
          testID="ai-estimate-action-proof"
        >
          {proofText}
        </Text>
      ) : null}
      <Text style={styles.estimateActionText}>
        Legacy preview доступен только для чтения. Для PDF и изменений выполните явную миграцию в canonical backend.
      </Text>
      {footerProofText ? (
        <Text
          accessible
          accessibilityLabel={footerProofText}
          style={[styles.estimateActionProof, styles.estimateActionFooterProof]}
          testID="ai-estimate-visible-lines"
        >
          {footerProofText}
        </Text>
      ) : null}
    </View>
  );
}

export function AIAssistantEstimateTable({ source, presentation }: EstimateTableProps) {
  const viewModel = presentation ?? (source.structuredEstimate
    ? buildEstimatePresentationViewModel(buildStructuredEstimatePayload(source.structuredEstimate, { source: "foreman" }))
    : undefined);
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
      <View style={styles.estimateVisibleLines} testID="ai-estimate-visible-lines-primary">
        {rows.slice(0, 8).map((row, index) => (
          <Text key={`${row.sectionTitle}:${row.rowNumber ?? index}:visible`} style={styles.estimateVisibleLine}>
            {[
              row.name,
              getEstimatePresentationQuantityText(row),
              getEstimatePresentationUnitPriceText(row, currency),
              getEstimatePresentationTotalText(row, currency),
              `Источник: ${row.sourceLabel ?? row.sourceEvidence?.[0]?.label ?? row.sourceId}`,
              `уверенность: ${formatEstimatePresentationConfidence(row.confidence)}`,
            ].join(" · ")}
          </Text>
        ))}
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
