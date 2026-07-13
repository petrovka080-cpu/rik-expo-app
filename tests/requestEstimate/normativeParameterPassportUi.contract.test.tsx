import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { EditableParamChips } from "../../src/features/requests/components/EditableParamChips";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";

function collectText(node: unknown): string {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  const children = (node as { children?: unknown[] }).children ?? [];
  return children.map(collectText).join(" ");
}

describe("normative parameter passport UI", () => {
  it("renders filled, missing, derived, normative and quantity trace sections", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "ui-normative-passport",
      rawInput: "Вентфасад 1500 м2 высота 40 м утепление 100 мм",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(React.createElement(EditableParamChips, { revision }));
    });

    const root = renderer!.root;
    expect(root.findByProps({ testID: "normative-parameter-passport" })).toBeTruthy();
    expect(root.findByProps({ testID: "normative-parameter-filled" })).toBeTruthy();
    expect(root.findByProps({ testID: "normative-parameter-missing" })).toBeTruthy();
    expect(root.findByProps({ testID: "normative-parameter-derived" })).toBeTruthy();
    expect(root.findByProps({ testID: "normative-parameter-defaults" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai-estimate-quantity-trace" })).toBeTruthy();
    expect(collectText(renderer!.toJSON())).not.toMatch(/\b[a-z][a-z0-9]+_[a-z0-9_]+\b/);
  });
});
