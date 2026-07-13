import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { InlineWorkPromptExtractedParam } from "../../../lib/ai/extractWorkParamsFromInlinePrompt";

export type ExtractedParamsChipsProps = {
  params: Record<string, InlineWorkPromptExtractedParam>;
};

function formatParamValue(param: InlineWorkPromptExtractedParam): string {
  const unit = param.canonicalUnit ?? param.unit ?? "";
  return [String(param.value), unit].filter(Boolean).join(" ");
}

export function buildExtractedParamChipLabels(
  params: Record<string, InlineWorkPromptExtractedParam>,
): string[] {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, param]) => `${key} = ${formatParamValue(param)}`);
}

export function ExtractedParamsChips({ params }: ExtractedParamsChipsProps): React.ReactElement | null {
  const labels = buildExtractedParamChipLabels(params);
  if (labels.length === 0) return null;
  return (
    <View pointerEvents="none" style={styles.wrap} testID="inline-work-prompt-param-chips">
      {labels.map((label) => (
        <View key={label} style={styles.chip} testID={`inline-work-prompt-param-chip-${label.split(" = ")[0]}`}>
          <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    minHeight: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  chipText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
});
