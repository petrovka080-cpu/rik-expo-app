import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { InlineWorkTemplateCandidate } from "../../../lib/ai/matchWorkTemplateFromPrompt";
import type { GlobalWorkSmartSearchSuggestion } from "../../../lib/ai/globalEstimate";

export type WorkTemplateSuggestionsProps = {
  candidateTemplates: InlineWorkTemplateCandidate[];
  legacyWorkSuggestions?: GlobalWorkSmartSearchSuggestion[];
  onSelectTemplateCandidate?: (candidate: InlineWorkTemplateCandidate) => void;
  onSelectLegacyWorkSuggestion?: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
};

export function buildWorkTemplateSuggestionLabels(input: {
  candidateTemplates: InlineWorkTemplateCandidate[];
  legacyWorkSuggestions?: GlobalWorkSmartSearchSuggestion[];
}): string[] {
  return [
    ...input.candidateTemplates.map((candidate) => `${candidate.templateName} ${Math.round(candidate.confidence * 100)}%`),
    ...(input.legacyWorkSuggestions ?? []).map((suggestion) => suggestion.visibleText),
  ];
}

export function WorkTemplateSuggestions({
  candidateTemplates,
  legacyWorkSuggestions = [],
  onSelectTemplateCandidate,
  onSelectLegacyWorkSuggestion,
}: WorkTemplateSuggestionsProps): React.ReactElement | null {
  if (candidateTemplates.length === 0 && legacyWorkSuggestions.length === 0) return null;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      testID="consumer-repair-work-suggestions"
    >
      {candidateTemplates.map((candidate, index) => (
        <Pressable
          key={candidate.templateId}
          accessibilityRole="button"
          accessibilityLabel={candidate.templateName}
          onPress={() => onSelectTemplateCandidate?.(candidate)}
          style={styles.button}
          testID={`inline-work-template-candidate-${index + 1}`}
        >
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={2}>{candidate.templateName}</Text>
            <Text style={styles.confidence}>{Math.round(candidate.confidence * 100)}%</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>{candidate.family} · {candidate.reason}</Text>
        </Pressable>
      ))}
      {legacyWorkSuggestions.slice(0, 12).map((suggestion, index) => (
        <Pressable
          key={suggestion.workKey}
          accessibilityRole="button"
          accessibilityLabel={suggestion.visibleText}
          onPress={() => onSelectLegacyWorkSuggestion?.(suggestion)}
          style={styles.button}
          testID={`consumer-repair-work-suggestion-${index + 1}`}
        >
          <Text style={styles.title}>{suggestion.titleRu}</Text>
          <Text style={styles.meta}>{suggestion.categoryTitleRu}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 328,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  content: {
    gap: 8,
    padding: 8,
  },
  button: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  confidence: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "900",
  },
  meta: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
});
