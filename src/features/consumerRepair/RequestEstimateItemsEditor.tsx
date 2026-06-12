import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ConsumerRepairItemRow } from "./ConsumerRepairItemRow";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  viewModel: RequestEstimateViewModel;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
};

export function RequestEstimateItemsEditor({
  viewModel,
  onDecrease,
  onIncrease,
  onRemove,
  onOpenCatalog,
}: Props): React.ReactElement {
  return (
    <View style={styles.wrap} testID="request-estimate-items-editor">
      <Text style={styles.heading}>{"\u041f\u043e\u0437\u0438\u0446\u0438\u0438"}</Text>
      {viewModel.sections.map((section) => (
        <View key={section.id} style={styles.section} testID={`request-estimate-section-${section.id}`}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <ConsumerRepairItemRow
              key={item.id}
              item={item}
              onDecrease={onDecrease}
              onIncrease={onIncrease}
              onRemove={onRemove}
              onOpenCatalog={onOpenCatalog}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  heading: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
