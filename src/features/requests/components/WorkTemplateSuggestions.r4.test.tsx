import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import type { GlobalWorkSmartSearchSuggestion } from "../../../lib/ai/globalEstimate";
import { WorkTemplateSuggestions } from "./WorkTemplateSuggestions";

function renderedText(node: TestRenderer.ReactTestInstance | string | number): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node.children.map((child) => renderedText(child as TestRenderer.ReactTestInstance | string | number)).join("");
}

function suggestion(index: number): GlobalWorkSmartSearchSuggestion {
  return {
    workKey: `canonical-work-${index}`,
    titleRu: `Работа с сочетанием ла ${index}`,
    categoryKey: "masonry",
    categoryTitleRu: "Кладка",
    defaultMeasureUnit: "sq_m",
    score: 0.5,
    matchKind: "phrase",
    matchedTokens: ["ла"],
    visibleText: `Работа с сочетанием ла ${index} · Кладка`,
  };
}

describe("R4 canonical work search renderer", () => {
  it("renders the backend total, source split and every supplied page row without a 12/15 cutoff", () => {
    const onLoadMore = jest.fn();
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <WorkTemplateSuggestions
          candidateTemplates={[]}
          legacyWorkSuggestions={Array.from({ length: 20 }, (_, index) => suggestion(index + 1))}
          literalTotalCount={3523}
          globalLiteralTotalCount={3485}
          externalLiteralTotalCount={38}
          shownCount={20}
          hasMore
          onLoadMore={onLoadMore}
        />,
      );
    });

    expect(tree!.root.findByProps({ testID: "consumer-repair-work-search-total" })).toBeTruthy();
    const suggestionTestIds = new Set(tree!.root
      .findAll((node) => /^consumer-repair-work-suggestion-\d+$/u.test(String(node.props.testID ?? "")))
      .map((node) => String(node.props.testID)));
    expect(suggestionTestIds.size).toBe(20);
    const renderedSuggestions = suggestionTestIds.size > 0 ? renderedText(tree!.root) : "";
    expect(renderedSuggestions).not.toContain("canonical-work-");
    expect(tree!.root.findAll((node) =>
      /^consumer-repair-work-suggestion-catalog-\d+$/u.test(String(node.props.testID ?? "")),
    )).toHaveLength(0);
    const text = renderedText(tree!.root.findByProps({ testID: "consumer-repair-work-search-total" }));
    expect(text).toContain("Найдено буквально: 3523");
    expect(text).toContain("Основной каталог: 3485 · справочные: 38");
    act(() => tree!.root.findByProps({ testID: "consumer-repair-work-search-load-more" }).props.onPress());
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
