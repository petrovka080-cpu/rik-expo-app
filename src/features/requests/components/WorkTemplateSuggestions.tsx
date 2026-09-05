import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { InlineWorkTemplateCandidate } from "../../../lib/ai/matchWorkTemplateFromPrompt";
import type { GlobalWorkSmartSearchSuggestion } from "../../../lib/ai/globalEstimate";

const WORK_TEMPLATE_SUGGESTION_MAX_ITEMS = 12;

function legacyWorkSuggestionKey(suggestion: GlobalWorkSmartSearchSuggestion): string {
  return suggestion.workKey;
}

export type WorkTemplateSuggestionsProps = {
  candidateTemplates: InlineWorkTemplateCandidate[];
  legacyWorkSuggestions?: GlobalWorkSmartSearchSuggestion[];
  onSelectTemplateCandidate?: (candidate: InlineWorkTemplateCandidate) => void;
  onSelectLegacyWorkSuggestion?: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  literalTotalCount?: number;
  globalLiteralTotalCount?: number;
  externalLiteralTotalCount?: number;
  suggestionTotalCount?: number;
  shownCount?: number;
  loading?: boolean;
  errorRu?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
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
  literalTotalCount = 0,
  globalLiteralTotalCount = literalTotalCount,
  externalLiteralTotalCount = 0,
  suggestionTotalCount = 0,
  shownCount = legacyWorkSuggestions.length,
  loading = false,
  errorRu = null,
  hasMore = false,
  onLoadMore,
}: WorkTemplateSuggestionsProps): React.ReactElement | null {
  if (candidateTemplates.length === 0 && legacyWorkSuggestions.length === 0 && !loading && !errorRu) return null;
  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.content}
      data={legacyWorkSuggestions}
      keyExtractor={legacyWorkSuggestionKey}
      renderItem={({ item: suggestion, index }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={suggestion.visibleText}
          accessibilityState={{ disabled: suggestion.estimateReady !== true }}
          disabled={suggestion.estimateReady !== true}
          onPress={() => onSelectLegacyWorkSuggestion?.(suggestion)}
          style={[styles.button, suggestion.estimateReady !== true && styles.disabledButton]}
          testID={`consumer-repair-work-suggestion-${index + 1}`}
        >
          <Text style={styles.title}>{suggestion.titleRu}</Text>
          <Text style={styles.meta}>{suggestion.categoryTitleRu}</Text>
          {suggestion.estimateReady !== true ? (
            <Text style={styles.unavailable} testID={`consumer-repair-work-suggestion-unavailable-${index + 1}`}>
              {suggestion.nonselectableReasonRu
                || "Эта смета проходит обновление состава и временно недоступна для нового расчёта."}
            </Text>
          ) : null}
        </Pressable>
      )}
      ListHeaderComponent={(
        <>
          {literalTotalCount > 0 || suggestionTotalCount > 0 ? (
            <View style={styles.summary} testID="consumer-repair-work-search-total">
              <Text style={styles.summaryTitle}>Найдено буквально: {literalTotalCount}</Text>
              <Text style={styles.summaryMeta}>Основной каталог: {globalLiteralTotalCount} · справочные: {externalLiteralTotalCount}</Text>
              <Text style={styles.summaryMeta}>Показано: {shownCount}{suggestionTotalCount ? ` · отдельных подсказок: ${suggestionTotalCount}` : ""}</Text>
            </View>
          ) : null}
          {candidateTemplates.slice(0, WORK_TEMPLATE_SUGGESTION_MAX_ITEMS).map((candidate, index) => (
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
        </>
      )}
      ListFooterComponent={(
        <>
          {errorRu ? <Text style={styles.error} testID="consumer-repair-work-search-error">{errorRu}</Text> : null}
          {loading ? <View style={styles.loading} testID="consumer-repair-work-search-loading"><ActivityIndicator /><Text style={styles.summaryMeta}>Ищем по полному каталогу…</Text></View> : null}
          {hasMore && !loading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Показать ещё работы. Сейчас показано ${shownCount} из ${literalTotalCount + suggestionTotalCount}`}
              onPress={onLoadMore}
              style={styles.loadMore}
              testID="consumer-repair-work-search-load-more"
            >
              <Text style={styles.loadMoreText}>Показать ещё ({shownCount} из {literalTotalCount + suggestionTotalCount})</Text>
            </Pressable>
          ) : null}
        </>
      )}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      testID="consumer-repair-work-suggestions"
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
    />
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
  summary: {
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  summaryTitle: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "900",
  },
  summaryMeta: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
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
  disabledButton: {
    opacity: 0.72,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  unavailable: {
    color: "#92400E",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
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
  loading: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  error: {
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  loadMore: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  loadMoreText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "900",
  },
});
