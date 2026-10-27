import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  buildNormPackCitationForRow,
  type NormPackCitation,
} from "../../../lib/estimate/normPackCitationContract";
import type { ProfessionalBoqRecipeRow } from "../../../lib/estimate/workPassportContract";

export type EstimateSourceCitationViewModel = {
  id: string;
  label: string;
  badge: string;
  citation: string;
  preliminary: boolean;
};

export function buildEstimateSourceCitationViewModels(input: {
  rows?: readonly ProfessionalBoqRecipeRow[];
  citations?: readonly NormPackCitation[];
}): EstimateSourceCitationViewModel[] {
  const citations = input.citations ?? input.rows?.map(buildNormPackCitationForRow) ?? [];
  const unique = new Map<string, EstimateSourceCitationViewModel>();
  for (const citation of citations) {
    if (unique.has(citation.registrySourceId)) continue;
    unique.set(citation.registrySourceId, {
      id: citation.registrySourceId,
      label: citation.normSourceTitle,
      badge: citation.sourceBadge,
      citation: citation.sourceCitation,
      preliminary: citation.preliminaryDisclosureRequired,
    });
  }
  return [...unique.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function EstimateSourceCitations(props: {
  rows?: readonly ProfessionalBoqRecipeRow[];
  citations?: readonly NormPackCitation[];
}): React.ReactElement | null {
  const sources = buildEstimateSourceCitationViewModels(props);
  if (sources.length === 0) return null;
  return (
    <View style={styles.wrap} testID="estimate-source-citations">
      {sources.map((source) => (
        <View key={source.id} style={styles.item} testID={`estimate-source-citation-${source.id}`}>
          <Text style={styles.badge}>{source.badge}</Text>
          <Text style={styles.citation}>{source.citation}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  item: {
    gap: 3,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  badge: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
  citation: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
});
