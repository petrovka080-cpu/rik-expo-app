import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevisionState } from "../../../lib/estimate/estimateDraftRevisionContract";

export function EstimateRevisionTimeline({
  state,
}: {
  state: EstimateDraftRevisionState | null;
}): React.ReactElement | null {
  if (!state) return null;
  const currentIndex = state.revisions.findIndex((revision) => revision.revisionId === state.currentRevisionId);
  const current = state.revisions[currentIndex] ?? state.revisions[state.revisions.length - 1];
  if (!current) return null;
  const artifactStatus = current.artifacts.artifactsValidForRevisionId === current.revisionId
    ? "PDF и пакет закупки актуальны"
    : "PDF и пакет закупки нужно пересоздать";
  return (
    <View style={styles.panel} testID="estimate-revision-timeline">
      <Text style={styles.title}>Ревизия R{currentIndex + 1}</Text>
      <Text style={styles.meta} testID="estimate-current-revision-id">{current.revisionId}</Text>
      <Text style={styles.meta} testID="estimate-current-revision-artifacts">{artifactStatus}</Text>
      <View style={styles.row}>
        {state.revisions.map((revision, index) => (
          <View
            key={revision.revisionId}
            style={[styles.dot, revision.revisionId === state.currentRevisionId ? styles.activeDot : null]}
            testID={`estimate-revision-timeline-r${index + 1}`}
          >
            <Text style={[styles.dotText, revision.revisionId === state.currentRevisionId ? styles.activeDotText : null]}>
              R{index + 1}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 6,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dot: {
    minWidth: 36,
    minHeight: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  activeDot: {
    borderColor: "#0F766E",
    backgroundColor: "#CCFBF1",
  },
  dotText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "900",
  },
  activeDotText: {
    color: "#0F766E",
  },
});
