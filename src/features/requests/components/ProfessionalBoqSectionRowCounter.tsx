import React from "react";
import { Text, View } from "react-native";

import type { ProfessionalBoqGroupedSection } from "../../../lib/estimate/professionalBoqSectionPolicy";

export type ProfessionalBoqSectionRowCounterModel = {
  sectionId: string;
  title: string;
  rowsCount: number;
  visibleRowsCount: number;
  hiddenRowsCount: number;
};

export function buildProfessionalBoqSectionRowCounterModel(
  section: ProfessionalBoqGroupedSection,
): ProfessionalBoqSectionRowCounterModel {
  return {
    sectionId: section.id,
    title: section.title,
    rowsCount: section.rows.length,
    visibleRowsCount: section.visibleRows.length,
    hiddenRowsCount: section.hiddenRowsCount,
  };
}

export function ProfessionalBoqSectionRowCounter({ section }: { section: ProfessionalBoqGroupedSection }) {
  const model = buildProfessionalBoqSectionRowCounterModel(section);
  return (
    <View testID={`professional-boq-section-counter-${model.sectionId}`}>
      <Text>{model.title}: {model.rowsCount}</Text>
      <Text>visible={model.visibleRowsCount}; hidden={model.hiddenRowsCount}</Text>
    </View>
  );
}
