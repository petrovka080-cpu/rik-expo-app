import React from "react";
import { StyleSheet, type TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { CatalogItemPicker } from "../../src/features/catalog/CatalogItemPicker";
import { ConsumerRepairRequestFormCard } from "../../src/features/consumerRepair/ConsumerRepairMediaButtons";
import {
  buildWorkEstimatePromptFieldState,
  buildWorkEstimatePromptFieldViewModel,
} from "../../src/features/requests/components/WorkEstimatePromptField";
import {
  buildMultiDomainReferenceSelectedWorkBinding,
  buildConsumerRepairSelectedWorkDraftBundle,
  buildSelectedWorkFromTemplateCandidate,
  buildSelectedWorkFromSuggestion,
  composeSelectedTemplateCandidateActiveInputText,
  composeSelectedWorkActiveInputText,
  preserveSelectedWorkResolverInput,
  shouldPreserveSelectedWorkForProblemText,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  searchGlobalWorkSmartSuggestions,
  type GlobalWorkSmartSearchSuggestion,
} from "../../src/lib/ai/globalEstimate";
import { matchWorkTemplateFromPrompt, type InlineWorkTemplateCandidate } from "../../src/lib/ai/matchWorkTemplateFromPrompt";

test("selected work keeps the original natural-language resolver input", () => {
  expect(preserveSelectedWorkResolverInput(
    "\u0432\u044b\u043a\u043e\u043f\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0448\u0435\u044e",
    "\u041f\u043e\u0434\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d\u044b\u0445 \u0441\u0435\u0442\u0435\u0439",
  )).toBe("\u0432\u044b\u043a\u043e\u043f\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0448\u0435\u044e");
  expect(preserveSelectedWorkResolverInput(
    "  ",
    "\u041f\u043e\u0434\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d\u044b\u0445 \u0441\u0435\u0442\u0435\u0439",
  )).toBe("\u041f\u043e\u0434\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d\u044b\u0445 \u0441\u0435\u0442\u0435\u0439");
});

test("a deterministic reference query binds its professional passport instead of a broad legacy suggestion", () => {
  const selectedWork = buildMultiDomainReferenceSelectedWorkBinding(
    "\u0440\u0430\u0437\u043e\u0431\u0440\u0430\u0442\u044c \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044e",
  );
  expect(selectedWork).toMatchObject({
    selectedWorkKey: "professional-estimate-passport:v4:building_structure_demolition",
    selectedTitleRu: "\u0420\u0430\u0437\u0431\u043e\u0440\u043a\u0430 \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0439",
    rawInput: "\u0440\u0430\u0437\u043e\u0431\u0440\u0430\u0442\u044c \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044e",
    resolverReGuessed: false,
  });
  const state = buildWorkEstimatePromptFieldState({
    value: selectedWork!.selectedTitleRu,
    selectedWork,
  });
  expect(buildWorkEstimatePromptFieldViewModel({ state }).buildEstimateButtonVisible).toBe(true);
});

function firstRoofSuggestion(): GlobalWorkSmartSearchSuggestion {
  const suggestions = searchGlobalWorkSmartSuggestions({
    query: "\u043a\u0440\u044b\u0448\u0430",
    limit: 8,
  });
  const suggestion = suggestions[0];
  if (!suggestion) throw new Error("roof selected-work suggestion fixture missing");
  return suggestion;
}

function renderForm(input: {
  problemText: string;
  selectedWork: ReturnType<typeof buildSelectedWorkFromSuggestion> | null;
  workSuggestions?: GlobalWorkSmartSearchSuggestion[];
  onSelectTemplateCandidate?: (candidate: InlineWorkTemplateCandidate) => void;
}) {
  const noop = () => undefined;
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <ConsumerRepairRequestFormCard
        problemText={input.problemText}
        city=""
        addressText=""
        preferredTimeText=""
        contactPhone=""
        selectedWork={input.selectedWork}
        workSuggestions={input.workSuggestions ?? []}
        problemInputRef={React.createRef<TextInput>()}
        onProblemTextChange={noop}
        onCityChange={noop}
        onAddressTextChange={noop}
        onPreferredTimeTextChange={noop}
        onContactPhoneChange={noop}
        onSelectWorkSuggestion={noop}
        onSelectTemplateCandidate={input.onSelectTemplateCandidate ?? noop}
      />,
    );
  });
  return tree;
}

describe("request estimate selected-work active input UX", () => {
  it("routes the preserved natural query through the production build after catalog selection", () => {
    const suggestion = searchGlobalWorkSmartSuggestions({
      query: "\u0432\u044b\u043a\u043e\u043f\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0448\u0435\u044e",
      limit: 8,
    })[0];
    expect(suggestion).toBeDefined();
    const visibleText = composeSelectedWorkActiveInputText(suggestion!);
    const selectedWork = buildSelectedWorkFromSuggestion(
      suggestion!,
      "\u0432\u044b\u043a\u043e\u043f\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0448\u0435\u044e",
    );

    const result = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "consumer_web_proof",
      problemText: visibleText,
      repairType: selectedWork.selectedCategoryKey,
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork,
    });

    expect(result.aiDraft.selectedWork?.selectedWorkKey).toBe("trench_excavation");
    expect(result.aiDraft.selectedWork?.selectedWorkRawInput).toBe(
      "\u0432\u044b\u043a\u043e\u043f\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0448\u0435\u044e",
    );
    expect(result.aiDraft.items.length).not.toBe(52);
    expect(result.aiDraft.items.every((item) =>
      item.sourceParameters?.multiDomainReferenceV4 === true
    )).toBe(true);
    const revision = result.bundle.estimateDraftRevisionState?.revisions[0];
    expect(revision?.selectedTemplateId).toBe(
      "professional-estimate-passport:v4:trench_excavation",
    );
    expect(revision?.missingInputs.map((item) => item.key)).toEqual(
      expect.arrayContaining(["length_m", "width_m", "depth_m", "productivity_m3_h"]),
    );
  });

  it("composes selected work into the editable textarea line and preserves key while quantity is appended", () => {
    const suggestion = firstRoofSuggestion();
    const activeInputText = composeSelectedWorkActiveInputText(suggestion);
    const selectedWork = buildSelectedWorkFromSuggestion(suggestion, activeInputText.trim());

    expect(activeInputText).toBe(`${suggestion.titleRu} `);
    expect(shouldPreserveSelectedWorkForProblemText(selectedWork, `${activeInputText}180 \u043c2`)).toBe(true);
    expect(shouldPreserveSelectedWorkForProblemText(selectedWork, "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043f\u043b\u0438\u0442\u043a\u0438 20 \u043c2")).toBe(false);
    expect(shouldPreserveSelectedWorkForProblemText(selectedWork, "")).toBe(false);
  });

  it("renders selected work in the active input instead of a separate selected-work block", () => {
    const suggestion = firstRoofSuggestion();
    const activeInputText = composeSelectedWorkActiveInputText(suggestion);
    const selectedWork = buildSelectedWorkFromSuggestion(suggestion, activeInputText.trim());
    const tree = renderForm({
      problemText: activeInputText,
      selectedWork,
      workSuggestions: [suggestion],
    });

    expect(tree.root.findByProps({ testID: "consumer-repair-problem-input" }).props.value).toBe(activeInputText);
    expect(tree.root.findAllByProps({ testID: "consumer-repair-selected-work" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "consumer-repair-work-suggestions" })).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  it("binds inline template candidates from the active suggestions list through the same selected-work contract", () => {
    const candidates = matchWorkTemplateFromPrompt({ rawInput: "\u043f\u0440\u043e" }).candidateTemplates;
    const pressurePipeline = candidates.find((candidate) => candidate.family === "pressure_pipeline");
    const villageWaterSupply = candidates.find((candidate) => candidate.family === "village_water_supply");

    expect(pressurePipeline).toBeTruthy();
    expect(villageWaterSupply).toBeTruthy();

    for (const candidate of [pressurePipeline, villageWaterSupply]) {
      if (!candidate) throw new Error("inline selected-work candidate missing");
      const activeInputText = composeSelectedTemplateCandidateActiveInputText(candidate);
      const selectedWork = buildSelectedWorkFromTemplateCandidate(candidate, activeInputText.trim());

      expect(candidate.workKey).toBe(candidate.family);
      expect(activeInputText).toBe(`${candidate.templateName} `);
      expect(selectedWork.selectedWorkKey).toBe(candidate.family);
      expect(selectedWork.selectedTitleRu).toBe(candidate.templateName);
      expect(shouldPreserveSelectedWorkForProblemText(selectedWork, `${activeInputText}100 \u043c`)).toBe(true);
    }
  });

  it("fires selection callbacks for inline template candidate rows, not only legacy catalog suggestions", () => {
    const selected: InlineWorkTemplateCandidate[] = [];
    const tree = renderForm({
      problemText: "\u043f\u0440\u043e",
      selectedWork: null,
      workSuggestions: [],
      onSelectTemplateCandidate: (candidate) => selected.push(candidate),
    });

    act(() => {
      tree.root.findByProps({ testID: "inline-work-template-candidate-1" }).props.onPress();
      tree.root.findByProps({ testID: "inline-work-template-candidate-2" }).props.onPress();
    });

    expect(selected.map((candidate) => candidate.family)).toEqual([
      "pressure_pipeline",
      "village_water_supply",
    ]);

    act(() => {
      tree.unmount();
    });
  });

  it("bounds work suggestions inside their own scroll container", () => {
    const suggestion = firstRoofSuggestion();
    const suggestions = Array.from({ length: 12 }, (_, index): GlobalWorkSmartSearchSuggestion => ({
      ...suggestion,
      workKey: `${suggestion.workKey}_${index}`,
      titleRu: `${suggestion.titleRu} ${index + 1}`,
      visibleText: `${suggestion.visibleText} ${index + 1}`,
    }));
    const tree = renderForm({
      problemText: "\u0441\u043c",
      selectedWork: null,
      workSuggestions: suggestions,
    });

    const suggestionsScroll = tree.root.findByProps({ testID: "consumer-repair-work-suggestions" });
    const style = StyleSheet.flatten(suggestionsScroll.props.style);
    expect(style.maxHeight).toBeGreaterThanOrEqual(280);
    expect(style.maxHeight).toBeLessThanOrEqual(360);
    expect(suggestionsScroll.props.nestedScrollEnabled).toBe(true);
    expect(tree.root.findByProps({ testID: "consumer-repair-work-suggestion-1" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "consumer-repair-work-suggestion-12" })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it("bounds catalog picker results inside their own scroll container", () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <CatalogItemPicker
          visible
          onClose={() => undefined}
          onSelect={() => undefined}
          initialQuery="\u043c\u0435\u0442\u0430\u043b\u043b\u043e\u0447\u0435\u0440\u0435\u043f\u0438\u0446\u0430"
        />,
      );
    });

    const resultsScroll = tree.root.findByProps({ testID: "request-catalog-picker-results-scroll" });
    const style = StyleSheet.flatten(resultsScroll.props.style);
    expect(style.flex).toBe(1);
    expect(style.minHeight).toBe(0);
    expect(resultsScroll.props.nestedScrollEnabled).toBe(true);
    expect(tree.root.findByProps({ testID: "request-catalog-picker-search" })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });
});
