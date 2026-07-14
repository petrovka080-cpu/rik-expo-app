import React from "react";
import { Text, View } from "react-native";

import type { ProfessionalBoqRow } from "../../../lib/estimate/estimateDraftRevisionContract";
import type { ProfessionalBoqMaterialCompletenessValidation } from "../../../lib/estimate/professionalBoqMaterialCompletenessContract";
import { validateProfessionalBoqMaterialCompleteness } from "../../../lib/estimate/validateProfessionalBoqMaterialCompleteness";
import { ProfessionalBoqMissingSlotsPanel } from "./ProfessionalBoqMissingSlotsPanel";

export type ProfessionalBoqMaterialCompletenessPanelModel = {
  passed: boolean;
  fullBoqRowsCount: number;
  visibleMainRowsCount: number;
  requiredMaterialSlotsCount: number;
  missingRequiredSlotsCount: number;
  snapshotRowsCount: number;
  pdfRowsCount: number;
  buyerHandoffRowsCount: number;
  truncationDetected: boolean;
  missingRequiredSlots: string[];
};

export function buildProfessionalBoqMaterialCompletenessPanelModel(
  validation: ProfessionalBoqMaterialCompletenessValidation,
): ProfessionalBoqMaterialCompletenessPanelModel {
  const c = validation.completeness;
  return {
    passed: validation.passed,
    fullBoqRowsCount: c.fullBoqRowsCount,
    visibleMainRowsCount: c.visibleMainRowsCount,
    requiredMaterialSlotsCount: c.requiredMaterialSlots.length,
    missingRequiredSlotsCount: c.missingRequiredSlots.length,
    snapshotRowsCount: c.fullSnapshotRowsCount,
    pdfRowsCount: c.pdfRowsCount,
    buyerHandoffRowsCount: c.buyerHandoffRowsCount,
    truncationDetected: c.rowCapDetected || c.backendTruncationDetected || c.pdfTruncationDetected || c.buyerTruncationDetected,
    missingRequiredSlots: c.missingRequiredSlots,
  };
}

export function buildProfessionalBoqMaterialCompletenessValidationForRows(input: {
  templateId: string;
  family: string;
  prompt: string;
  rows: readonly ProfessionalBoqRow[];
}): ProfessionalBoqMaterialCompletenessValidation {
  const buyerHandoffRowIds = input.rows
    .filter((row) => row.includedInProcurement)
    .filter((row) => row.rowType !== "work" && row.rowType !== "labor")
    .map((row) => row.rowId);
  return validateProfessionalBoqMaterialCompleteness({
    templateId: input.templateId,
    family: input.family,
    prompt: input.prompt,
    rows: input.rows,
    snapshotRows: input.rows,
    detailDrawerRowsCount: input.rows.length,
    pdfRowsCount: input.rows.length,
    buyerHandoffRowIds,
  });
}

export function ProfessionalBoqMaterialCompletenessPanel(input: {
  validation: ProfessionalBoqMaterialCompletenessValidation;
}) {
  const model = buildProfessionalBoqMaterialCompletenessPanelModel(input.validation);
  return (
    <View testID="professional-boq-material-completeness-panel">
      <Text>{model.passed ? "Состав материалов полный" : "Состав материалов требует внимания"}</Text>
      <Text>
        {`full=${model.fullBoqRowsCount}; visible=${model.visibleMainRowsCount}; slots=${model.requiredMaterialSlotsCount}; missing=${model.missingRequiredSlotsCount}`}
      </Text>
      <Text>
        {`snapshot=${model.snapshotRowsCount}; pdf=${model.pdfRowsCount}; buyer=${model.buyerHandoffRowsCount}; truncation=${String(model.truncationDetected)}`}
      </Text>
      <Text>Показать полный состав сметы</Text>
      <Text>Скачать PDF</Text>
      <Text>Список закупки</Text>
      <ProfessionalBoqMissingSlotsPanel
        missingRequiredSlots={model.missingRequiredSlots}
        missingOptionalButExpectedSlots={input.validation.completeness.missingOptionalButExpectedSlots}
      />
    </View>
  );
}
