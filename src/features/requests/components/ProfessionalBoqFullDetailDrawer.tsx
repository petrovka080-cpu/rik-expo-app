import React from "react";
import { SectionList, Text } from "react-native";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";
import { buildProfessionalBoqGroupedMainViewModel } from "../../../lib/estimate/professionalBoqSectionPolicy";
import { ProfessionalBoqLineItem } from "./ProfessionalBoqLineItem";
import { professionalBoqSectionSummaryText } from "./ProfessionalBoqSectionSummary";

export function buildProfessionalBoqFullDetailDrawerModel(rows: readonly ProfessionalBoqLineItemQuality[]) {
  return buildProfessionalBoqGroupedMainViewModel(rows, Number.MAX_SAFE_INTEGER);
}

export function ProfessionalBoqFullDetailDrawer({ rows }: { rows: readonly ProfessionalBoqLineItemQuality[] }) {
  const model = buildProfessionalBoqFullDetailDrawerModel(rows);
  return (
    <SectionList
      testID="professional-boq-full-detail-drawer"
      sections={model.sections.map((section) => ({ ...section, data: section.visibleRows }))}
      keyExtractor={(row) => row.rowId}
      renderItem={({ item }) => <ProfessionalBoqLineItem row={item} />}
      renderSectionHeader={({ section }) => (
        <Text>{professionalBoqSectionSummaryText(section)}</Text>
      )}
      ListHeaderComponent={<Text>{String(model.rawRowsCount)}</Text>}
      ListEmptyComponent={<Text>Нет строк</Text>}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
      stickySectionHeadersEnabled={false}
    />
  );
}
