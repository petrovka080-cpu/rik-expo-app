import React from "react";
import { FlatList, Text } from "react-native";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";
import { buildProfessionalBoqGroupedMainViewModel } from "../../../lib/estimate/professionalBoqSectionPolicy";
import { ProfessionalBoqLineItem } from "./ProfessionalBoqLineItem";

function professionalBoqRowKey(row: ProfessionalBoqLineItemQuality): string {
  return row.rowId;
}

export function buildProfessionalBoqFullDetailDrawerModel(rows: readonly ProfessionalBoqLineItemQuality[]) {
  return buildProfessionalBoqGroupedMainViewModel(rows, Number.MAX_SAFE_INTEGER);
}

export function ProfessionalBoqFullDetailDrawer({ rows }: { rows: readonly ProfessionalBoqLineItemQuality[] }) {
  const model = buildProfessionalBoqFullDetailDrawerModel(rows);
  const visibleRows = model.sections.flatMap((section) => section.visibleRows);
  return (
    <FlatList
      testID="professional-boq-full-detail-drawer"
      data={visibleRows}
      keyExtractor={professionalBoqRowKey}
      renderItem={({ item }) => <ProfessionalBoqLineItem row={item} />}
      ListHeaderComponent={<Text>{String(model.rawRowsCount)}</Text>}
      ListEmptyComponent={<Text>Нет строк</Text>}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
    />
  );
}
