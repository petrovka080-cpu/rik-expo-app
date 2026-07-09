import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalWorkPassport } from "../../../lib/estimate/workPassportContract";
import { EstimateSourceCitations } from "./EstimateSourceCitations";

function estimateLevelRu(level: ProfessionalWorkPassport["estimateLevel"]): string {
  if (level === "PROFESSIONAL_EXPANDED") return "профессиональная расширенная смета";
  if (level === "ROM_CONCEPT") return "укрупненная концепция";
  if (level === "PRELIMINARY_BOQ") return "предварительная ведомость объемов";
  if (level === "DETAILED_BOQ_FROM_DRAWINGS") return "детальная ведомость по чертежам";
  if (level === "TENDER_BOQ") return "тендерная ведомость";
  return "исполнительная смета";
}

export function buildEstimateAssumptionLines(passport: ProfessionalWorkPassport): string[] {
  return [
    `${estimateLevelRu(passport.estimateLevel)}: объемы рассчитаны из введенных параметров и профессиональных допущений.`,
    passport.riskPolicy.specialistReviewNoteRequired
      ? "Перед тендером, договором или производством нужен профильный инженерный просмотр."
      : "Предварительную ведомость можно показать, пока источники цен еще не выбраны.",
    "Итоговая сумма не фиксируется без принятого прайс-листа, каталога или поставщика.",
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
