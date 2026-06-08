import React from "react";
import { StyleSheet, type TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { CatalogItemPicker } from "../../src/features/catalog/CatalogItemPicker";
import { ConsumerRepairRequestFormCard } from "../../src/features/consumerRepair/ConsumerRepairMediaButtons";
import {
  buildSelectedWorkFromSuggestion,
  composeSelectedWorkActiveInputText,
  shouldPreserveSelectedWorkForProblemText,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  searchGlobalWorkSmartSuggestions,
  type GlobalWorkSmartSearchSuggestion,
} from "../../src/lib/ai/globalEstimate";

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
      />,
    );
  });
  return tree;
}

describe("request estimate selected-work active input UX", () => {
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
