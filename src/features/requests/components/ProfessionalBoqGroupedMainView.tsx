import React from "react";
import { Text, View } from "react-native";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";
import {
  buildProfessionalBoqGroupedMainViewModel,
  PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS,
} from "../../../lib/estimate/professionalBoqSectionPolicy";
import { ProfessionalBoqSectionSummary } from "./ProfessionalBoqSectionSummary";

export { buildProfessionalBoqGroupedMainViewModel, PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS };

export function ProfessionalBoqGroupedMainView({ rows }: { rows: readonly ProfessionalBoqLineItemQuality[] }) {
  const model = buildProfessionalBoqGroupedMainViewModel(rows);
  return (
    <View testID="professional-boq-grouped-main-view">
      <Text>{String(model.visibleRowsCount)}</Text>
      {model.sections.map((section) => (
        <ProfessionalBoqSectionSummary key={section.id} section={section} />
      ))}
    </View>
  );
}
