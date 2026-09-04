import React from "react";
import { View } from "react-native";

import type { ProfessionalBoqGroupedSection } from "../../../lib/estimate/professionalBoqSectionPolicy";
import { ProfessionalBoqLineItem } from "./ProfessionalBoqLineItem";

export function professionalBoqSectionSummaryText(section: ProfessionalBoqGroupedSection): string {
  const hidden = section.hiddenRowsCount > 0 ? ` +${section.hiddenRowsCount}` : "";
  return `${section.title}: ${section.rows.length}${hidden}`;
}

export function ProfessionalBoqSectionSummary({ section }: { section: ProfessionalBoqGroupedSection }) {
  return (
    <View testID={`professional-boq-section-${section.id}`}>
      {section.visibleRows.map((row) => (
        <ProfessionalBoqLineItem key={row.rowId} row={row} />
      ))}
    </View>
  );
}
