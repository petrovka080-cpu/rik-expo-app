import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { InlineWorkPromptAssumption, InlineWorkPromptMissingInput } from "../../../lib/ai/parseInlineWorkEstimatePrompt";

export type MissingInputsPanelProps = {
  assumptions: InlineWorkPromptAssumption[];
  missingInputs: InlineWorkPromptMissingInput[];
};

function userFacingRequiredForLabel(value: InlineWorkPromptMissingInput["requiredFor"]): string {
  if (value === "contract_ready") return "\u0434\u043b\u044f \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u043d\u043e\u0439 \u0441\u043c\u0435\u0442\u044b";
  if (value === "safety_review") return "\u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438";
  return "\u0434\u043b\u044f \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u0438";
}

function userFacingAssumptionReason(item: InlineWorkPromptAssumption): string {
  if (/Derived from user-entered length, height and thickness\./.test(item.reason)) {
    return "\u043e\u0431\u044a\u0435\u043c \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d \u0438\u0437 \u0432\u0432\u0435\u0434\u0435\u043d\u043d\u044b\u0445 \u0434\u043b\u0438\u043d\u044b, \u0432\u044b\u0441\u043e\u0442\u044b \u0438 \u0442\u043e\u043b\u0449\u0438\u043d\u044b";
  }
  return item.reason;
}

export function buildMissingInputsPanelLines(input: MissingInputsPanelProps): string[] {
  return [
    ...input.assumptions.map((item) => `\u041f\u0440\u0438\u043d\u044f\u0442\u043e \u0434\u043b\u044f \u0440\u0430\u0441\u0447\u0435\u0442\u0430: ${userFacingAssumptionReason(item)}`),
    ...input.missingInputs.map((item) => `${item.label} \u00b7 ${userFacingRequiredForLabel(item.requiredFor)}`),
  ];
}

export function MissingInputsPanel({
  assumptions,
  missingInputs,
}: MissingInputsPanelProps): React.ReactElement | null {
  const lines = buildMissingInputsPanelLines({ assumptions, missingInputs });
  if (lines.length === 0) return null;
  return (
    <View pointerEvents="none" style={styles.wrap} testID="inline-work-prompt-missing-inputs">
      {lines.slice(0, 8).map((line) => (
        <Text key={line} style={styles.line} testID="inline-work-prompt-missing-input-line">
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 10,
  },
  line: {
    color: "#9A3412",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
});
