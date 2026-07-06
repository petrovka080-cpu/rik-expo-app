import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalWorkPassport } from "../../../lib/estimate/workPassportContract";
import { EstimateSourceCitations } from "./EstimateSourceCitations";

export function buildEstimateAssumptionLines(passport: ProfessionalWorkPassport): string[] {
  return [
    `${passport.estimateLevel}: quantities are calculated from captured prompt parameters and professional defaults.`,
    passport.riskPolicy.specialistReviewNoteRequired
      ? "Specialist review is required before tender, contract, or construction release."
      : "Preliminary BOQ can be shown while final price sources remain missing.",
    "No final total is produced until accepted pricebook, catalog, or supplier sources exist.",
  ];
}

export function EstimateAssumptionsAndSources(props: {
  passport: ProfessionalWorkPassport;
  assumptions?: readonly string[];
}): React.ReactElement {
  const assumptions = props.assumptions?.length ? [...props.assumptions] : buildEstimateAssumptionLines(props.passport);
  return (
    <View style={styles.wrap} testID="estimate-assumptions-and-sources">
      {assumptions.map((line, index) => (
        <Text key={`${index}-${line}`} style={styles.assumption}>{line}</Text>
      ))}
      <EstimateSourceCitations rows={props.passport.boqRecipe.allRows} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  assumption: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
});
