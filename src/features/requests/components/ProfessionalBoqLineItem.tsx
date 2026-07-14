import React from "react";
import { Text, View } from "react-native";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";

export function formatProfessionalBoqLineItem(row: ProfessionalBoqLineItemQuality): string {
  return `${row.displayName}; ${row.canonicalUnit ?? ""}; ${row.citationLabel}`.trim();
}

export function ProfessionalBoqLineItem({ row }: { row: ProfessionalBoqLineItemQuality }) {
  return (
    <View testID={`professional-boq-row-${row.rowId}`}>
      <Text>{row.displayName}</Text>
      <Text>{row.nomenclatureName}</Text>
      <Text>{row.citationLabel}</Text>
    </View>
  );
}
