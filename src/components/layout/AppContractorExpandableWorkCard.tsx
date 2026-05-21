import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ContractorWorkMediaPlacement = {
  workId: string;
  expanded: boolean;
  mediaControlsVisibleOnlyWhenExpanded: true;
  photoButtonVisible: boolean;
  videoButtonVisible: boolean;
  attachTarget: "contractor_work" | "remark" | "act_draft";
};

export type AppContractorExpandableWorkCardProps = ContractorWorkMediaPlacement & {
  titleRu: string;
  children: React.ReactNode;
};

export function AppContractorExpandableWorkCard({
  expanded,
  titleRu,
  children,
}: AppContractorExpandableWorkCardProps): React.ReactElement | null {
  if (!expanded) return null;

  return (
    <View testID="contractor.work.expanded.media" style={styles.card}>
      <Text style={styles.title}>{titleRu}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
});
