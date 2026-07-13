import React from "react";
import { Text, View } from "react-native";

export type ProfessionalBoqMissingSlotsPanelModel = {
  missingRequiredSlotsCount: number;
  missingOptionalButExpectedSlotsCount: number;
  missingRequiredSlots: string[];
  passed: boolean;
};

export function buildProfessionalBoqMissingSlotsPanelModel(input: {
  missingRequiredSlots: readonly string[];
  missingOptionalButExpectedSlots?: readonly string[];
}): ProfessionalBoqMissingSlotsPanelModel {
  return {
    missingRequiredSlotsCount: input.missingRequiredSlots.length,
    missingOptionalButExpectedSlotsCount: input.missingOptionalButExpectedSlots?.length ?? 0,
    missingRequiredSlots: [...input.missingRequiredSlots],
    passed: input.missingRequiredSlots.length === 0,
  };
}

export function ProfessionalBoqMissingSlotsPanel(input: {
  missingRequiredSlots: readonly string[];
  missingOptionalButExpectedSlots?: readonly string[];
}) {
  const model = buildProfessionalBoqMissingSlotsPanelModel(input);
  return (
    <View testID="professional-boq-missing-slots-panel">
      <Text>{model.passed ? "Материальные слоты закрыты" : "Есть незакрытые материальные слоты"}</Text>
      <Text>required_missing={model.missingRequiredSlotsCount}</Text>
      {model.missingRequiredSlots.map((slot) => (
        <Text key={slot}>{slot}</Text>
      ))}
    </View>
  );
}
