import React from "react";
import { ScrollView, Text } from "react-native";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";
import { buildProfessionalBoqGroupedMainViewModel } from "../../../lib/estimate/professionalBoqSectionPolicy";
import { ProfessionalBoqSectionSummary } from "./ProfessionalBoqSectionSummary";

export function buildProfessionalBoqFullDetailDrawerModel(rows: readonly ProfessionalBoqLineItemQuality[]) {
  return buildProfessionalBoqGroupedMainViewModel(rows, Number.MAX_SAFE_INTEGER);
}

export function ProfessionalBoqFullDetailDrawer({ rows }: { rows: readonly ProfessionalBoqLineItemQuality[] }) {
  const model = buildProfessionalBoqFullDetailDrawerModel(rows);
  return (
    <ScrollView testID="professional-boq-full-detail-drawer">
      <Text>{String(model.rawRowsCount)}</Text>
      {model.sections.map((section) => (
        <ProfessionalBoqSectionSummary key={section.id} section={section} />
      ))}
    </ScrollView>
  );
}
