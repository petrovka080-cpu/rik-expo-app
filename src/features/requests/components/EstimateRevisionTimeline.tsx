import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevisionState } from "../../../lib/estimate/estimateDraftRevisionContract";

type Revision = EstimateDraftRevisionState["revisions"][number];

export function estimateRevisionArtifactsStatusRu(revision: Revision): string {
  const artifacts = revision.artifacts;
  const procurementApplicable = revision.boq.rows.some((row) => row.includedInProcurement);
  const hasPdf = Boolean(artifacts.pdfArtifactId);
  const hasProcurement = Boolean(artifacts.procurementArtifactId);
  const pdfCurrent = hasPdf && artifacts.pdfValidForRevisionId === revision.revisionId;
  const procurementCurrent = hasProcurement
    && artifacts.procurementValidForRevisionId === revision.revisionId;
  if (!procurementApplicable) {
    if (!hasPdf) return "PDF ещё не создан; закупка для этой операции не требуется";
    if (pdfCurrent) return "PDF актуален; закупка для этой операции не требуется";
    return "PDF относится к предыдущей версии — его нужно пересоздать; закупка не требуется";
  }
  if (!hasPdf && !hasProcurement) return "PDF и пакет закупки ещё не созданы";
  if (pdfCurrent && procurementCurrent) return "PDF и пакет закупки актуальны";
  if (pdfCurrent && !hasProcurement) return "PDF готов; пакет закупки ещё не создан";
  if (procurementCurrent && !hasPdf) return "Пакет закупки готов; PDF ещё не создан";
  return "Есть файлы от предыдущей версии — их нужно пересоздать";
}

export function EstimateRevisionTimeline({
  state,
}: {
  state: EstimateDraftRevisionState | null;
}): React.ReactElement | null {
  if (!state) return null;
  const currentIndex = state.revisions.findIndex((revision) => revision.revisionId === state.currentRevisionId);
  const current = state.revisions[currentIndex] ?? state.revisions[state.revisions.length - 1];
  if (!current) return null;
  const currentNumber = Number.isInteger(current.canonicalRevisionNumber) && Number(current.canonicalRevisionNumber) > 0
    ? Number(current.canonicalRevisionNumber)
    : currentIndex + 1;
  const selectedCatalogId = current.resolvedIdentity?.requestedCatalogWorkId
    ?? current.selectedTemplateId;
  const selectedWorkKey = current.professionalWorkId?.trim() ?? "";
  const applicableRowCount = current.applicableBoqRowsCount ?? current.boq.rows.length;
  const compiledRevisionMarkerTestId = [
    "estimate-compiled-revision-v1",
    `catalog-${selectedCatalogId}`,
    `work-${selectedWorkKey}`,
    `owner-${selectedWorkKey}`,
    `revision-${current.revisionId}`,
    `ordinal-${currentNumber}`,
    `rows-${applicableRowCount}`,
    `status-${current.status}`,
  ].join("--");
  const artifactStatus = estimateRevisionArtifactsStatusRu(current);
  const timelineAccessibilityLabel = [
    "estimate-revision-timeline",
    `${state.revisions.length}-revisions`,
    `${state.diffs.length}-diffs`,
  ].join("--");
  return (
    <View
      accessibilityLabel={timelineAccessibilityLabel}
      style={styles.panel}
      testID="estimate-revision-timeline"
    >
      <Text style={styles.title} testID={compiledRevisionMarkerTestId}>Версия {currentNumber}</Text>
      <Text style={styles.meta} testID="estimate-current-revision-artifacts">{artifactStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 6,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
});
