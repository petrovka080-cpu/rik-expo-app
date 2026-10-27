import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalCostPriceState } from "../../../lib/estimate/professionalCostingContract";

const LABELS: Record<ProfessionalCostPriceState, string> = {
  source_price: "source price",
  internal_pricebook: "pricebook",
  expert_reviewed_price: "expert reviewed",
  preliminary_market_assumption: "preliminary",
  missing_price: "missing price",
};

export function priceStateBadgeLabel(state: ProfessionalCostPriceState): string {
  return LABELS[state];
}

export function PriceStateBadge({ state }: { state: ProfessionalCostPriceState }): React.ReactElement {
  const missing = state === "missing_price";
  return (
    <View
      style={[styles.badge, missing ? styles.missing : styles.priced]}
      testID={`price-state-badge-${state}`}
    >
      <Text style={[styles.text, missing ? styles.missingText : styles.pricedText]}>
        {priceStateBadgeLabel(state)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priced: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  missing: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  pricedText: {
    color: "#047857",
  },
  missingText: {
    color: "#B91C1C",
  },
});
