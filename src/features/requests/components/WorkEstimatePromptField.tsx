import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../../lib/ai/globalEstimate";
import type { InlineWorkTemplateCandidate } from "../../../lib/ai/matchWorkTemplateFromPrompt";
import { deriveWorkPromptState, type WorkPromptState } from "../../../lib/ai/workPromptStateMachine";
import type { ConsumerRepairAiDraft } from "../../../lib/consumerRequests";
import { ExtractedParamsChips } from "./ExtractedParamsChips";
import { MissingInputsPanel } from "./MissingInputsPanel";
import { ProfessionalEstimateDraftPreview } from "./ProfessionalEstimateDraftPreview";
import { WorkTemplateSuggestions } from "./WorkTemplateSuggestions";

export type WorkEstimatePromptFieldViewModel = {
  stateStatus: WorkPromptState["status"];
  matchedWorkVisible: boolean;
  matchedWorkLabel: string | null;
  confidenceLabel: string | null;
  extractedParamChipsVisible: boolean;
  assumptionsVisible: boolean;
  missingInputsVisible: boolean;
  buildEstimateButtonVisible: boolean;
  draftPreviewVisible: boolean;
  recognizedPromptNeverLeavesSilentEmptyDraft: boolean;
};

export type WorkEstimatePromptFieldProps = {
  value: string;
  selectedWork?: GlobalSelectedWorkBinding | null;
  legacyWorkSuggestions?: GlobalWorkSmartSearchSuggestion[];
  draft?: ConsumerRepairAiDraft | null;
  inputRef?: React.RefObject<TextInput | null>;
  inputTestID?: string;
  placeholder?: string;
  previousState?: WorkPromptState | null;
  onChangeText: (value: string) => void;
  onBuildEstimate?: () => void;
  onSelectLegacyWorkSuggestion?: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onSelectTemplateCandidate?: (candidate: InlineWorkTemplateCandidate) => void;
};

export function buildWorkEstimatePromptFieldState(input: {
  value: string;
  selectedWork?: GlobalSelectedWorkBinding | null;
  previousState?: WorkPromptState | null;
  draft?: ConsumerRepairAiDraft | null;
}): WorkPromptState {
  return deriveWorkPromptState({
    rawInput: input.value,
    selectedTemplateId: input.selectedWork?.selectedWorkKey,
    selectedTemplateName: input.selectedWork?.selectedTitleRu,
    previousState: input.previousState,
    draftReady: Boolean(input.draft && input.draft.items.length > 0),
  });
}

export function buildWorkEstimatePromptFieldViewModel(input: {
  state: WorkPromptState;
  draft?: ConsumerRepairAiDraft | null;
}): WorkEstimatePromptFieldViewModel {
  const matched = input.state.parseResult.matchedTemplate;
  const paramsVisible = Object.keys(input.state.parseResult.extractedParams).length > 0;
  const candidateVisible = input.state.parseResult.candidateTemplates.length > 0;
  return {
    stateStatus: input.state.status,
    matchedWorkVisible: Boolean(matched),
    matchedWorkLabel: matched?.templateName ?? null,
    confidenceLabel: matched ? `${Math.round(matched.confidence * 100)}%` : null,
    extractedParamChipsVisible: paramsVisible,
    assumptionsVisible: input.state.parseResult.assumptions.length > 0,
    missingInputsVisible: input.state.parseResult.missingInputs.length > 0,
    buildEstimateButtonVisible: input.state.parseResult.canBuildPreliminaryEstimate,
    draftPreviewVisible: Boolean(input.draft && input.draft.items.length > 0),
    recognizedPromptNeverLeavesSilentEmptyDraft: Boolean(
      matched ||
      candidateVisible ||
      !input.state.rawInput.trim(),
    ),
  };
}

export function WorkEstimatePromptField({
  value,
  selectedWork,
  legacyWorkSuggestions = [],
  draft,
  inputRef,
  inputTestID = "consumer-repair-problem-input",
  placeholder = "Введите тип или вид работ: укладка плитки 45 м2, монтаж ламината 80 м2, штукатурка стен 120 м2, стяжка пола 60 м2, электромонтаж 35 точек; добавьте объем и параметры",
  previousState,
  onChangeText,
  onBuildEstimate,
  onSelectLegacyWorkSuggestion,
  onSelectTemplateCandidate,
}: WorkEstimatePromptFieldProps): React.ReactElement {
  const state = buildWorkEstimatePromptFieldState({ value, selectedWork, previousState, draft });
  const model = buildWorkEstimatePromptFieldViewModel({ state, draft });
  const candidateTemplates = state.parseResult.matchedTemplate
    ? []
    : state.parseResult.candidateTemplates;

  return (
    <View pointerEvents="box-none" style={styles.wrap} testID="inline-work-prompt-field">
      <TextInput
        ref={inputRef}
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        testID={inputTestID}
      />
      {model.matchedWorkVisible ? (
        <View style={styles.matchBox} testID="inline-work-prompt-matched-work">
          <Text style={styles.matchTitle} numberOfLines={2}>{model.matchedWorkLabel}</Text>
          <Text style={styles.matchMeta}>Confidence {model.confidenceLabel} · {state.status}</Text>
        </View>
      ) : null}
      <WorkTemplateSuggestions
        candidateTemplates={candidateTemplates}
        legacyWorkSuggestions={selectedWork ? [] : legacyWorkSuggestions}
        onSelectTemplateCandidate={onSelectTemplateCandidate}
        onSelectLegacyWorkSuggestion={onSelectLegacyWorkSuggestion}
      />
      <ExtractedParamsChips params={state.parseResult.extractedParams} />
      <MissingInputsPanel
        assumptions={state.parseResult.assumptions}
        missingInputs={state.parseResult.missingInputs}
      />
      {model.buildEstimateButtonVisible && onBuildEstimate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сформировать смету"
          onPress={onBuildEstimate}
          style={styles.buildButton}
          testID="inline-work-prompt-build-estimate"
        >
          <Ionicons name="calculator-outline" size={16} color="#FFFFFF" />
          <Text style={styles.buildButtonText}>Сформировать смету</Text>
        </Pressable>
      ) : null}
      <ProfessionalEstimateDraftPreview draft={draft} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  input: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    textAlignVertical: "top",
  },
  matchBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 10,
    gap: 3,
  },
  matchTitle: {
    color: "#1E3A8A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  matchMeta: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  buildButton: {
    position: "relative",
    zIndex: 2,
    elevation: 2,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buildButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
