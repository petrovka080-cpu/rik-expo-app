import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { InlineWorkPromptAssumption, InlineWorkPromptMissingInput } from "../../../lib/ai/parseInlineWorkEstimatePrompt";

export type MissingInputsPanelProps = {
  assumptions: InlineWorkPromptAssumption[];
  missingInputs: InlineWorkPromptMissingInput[];
};

export function buildMissingInputsPanelLines(input: MissingInputsPanelProps): string[] {
  return [
    ...input.assumptions.map((item) => `Assumption: ${item.reason}`),
    ...input.missingInputs.map((item) => `${item.label} (${item.requiredFor})`),
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
