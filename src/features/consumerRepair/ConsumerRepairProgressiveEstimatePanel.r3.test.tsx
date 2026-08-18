import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  buildConsumerRepairProgressiveParameterCards,
  InlineParamEditor,
} from "./ConsumerRepairProgressiveEstimatePanel";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("InlineParamEditor R3 parameter guide", () => {
  it("does not turn persisted BOQ assumptions into inputs when the canonical user-input set is empty", () => {
    const cards = buildConsumerRepairProgressiveParameterCards({
      revision: null,
      viewModel: {
        assumptionRows: [{ id: "expanded_quantity_delivery", label: "Количество: Доставка", value: "1 т·км" }],
      } as never,
      canonicalParameterSession: {
        parameters: [],
      } as never,
    });
    expect(cards).toEqual([]);
  });

  it("держит серую норму внутри пустого input и сохраняет её подписью после ввода", () => {
    const onChange = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <InlineParamEditor
          paramKey="primer_consumption"
          label="Расход праймера"
          inputKind="number"
          value=""
          unitLabel="л/м²"
          dirty={false}
          guideShortRu="Норма: 1,5–2,0 л/м²"
          onChange={onChange}
        />,
      );
    });

    const input = renderer.root.findByProps({ testID: "editable-param-popover-input" });
    expect(input.props.placeholder).toBe("Норма: 1,5–2,0 л/м²");
    expect(input.props.placeholderTextColor).toBe("#64748B");
    expect(renderer.root.findAllByProps({ testID: "editable-param-guide-primer_consumption" })).toHaveLength(0);

    act(() => input.props.onFocus());
    expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.placeholder).toBeUndefined();
    expect(renderer.root.findByProps({ testID: "editable-param-guide-primer_consumption" }).props.children)
      .toBe("Норма: 1,5–2,0 л/м²");

    act(() => renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.onChangeText("1,7"));
    expect(onChange).toHaveBeenCalledWith("primer_consumption", "1,7");
  });
});
