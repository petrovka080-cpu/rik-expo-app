import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  buildConsumerRepairProgressiveParameterCards,
  ConsumerRepairProgressiveEstimatePanel,
  InlineParamEditor,
} from "./ConsumerRepairProgressiveEstimatePanel";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("InlineParamEditor R3 parameter guide", () => {
  it("opens, shows the persisted value, refreshes the exact session, and closes again", () => {
    const onRefineCanonicalParameters = jest.fn();
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairProgressiveEstimatePanel
          viewModel={{
            title: "Асфальтирование парковки — 987 м²",
            summary: "",
            totalLabel: "",
            priceStatusLabel: "",
            sourceConfidenceLabel: "",
            sourceLabels: [],
            taxLabel: "",
            trustLevelLabel: "",
            commercialEstimateLevelLabel: "",
            sourceQualityLabel: "",
            expertReviewStatusLabel: "",
            fullTotalStatusLabel: "",
            visibleLines: [],
            assumptionRows: [],
            sections: [],
            professionalPreview: false,
            previewSections: [],
            calculationPreviewLines: [],
            normSourcePreviewLines: [],
            rawItemCount: 0,
            manualCatalogItems: [],
          }}
          revisionState={null}
          currentRevision={null}
          latestDiff={null}
          canonicalParameterSession={{
            revisionId: "revision-987",
            status: "PRELIMINARY_WITH_ASSUMPTIONS",
            parameters: [{
              parameterId: "area_m2",
              label: "Площадь покрытия",
              description: "Площадь покрытия по исходному запросу",
              value: 987,
              valueType: "number",
              unit: "м²",
              requiredLevel: "CONTRACT_REQUIRED",
              visibilityCondition: { kind: "ALWAYS" },
              validation: { min: 1 },
              allowedValues: [],
              source: "ASSUMED",
              state: "ASSUMED",
              confidence: 0.7,
              assumption: "Предварительно принято из исходного запроса.",
              affectsRows: ["asphalt:area"],
              affectsFormula: ["asphalt:area:formula"],
              normativeSource: null,
              displayOrder: 1,
              sourceText: "Из исходного запроса",
              valid: true,
              validationIssues: [],
            }],
            blockingMissingParameterIds: [],
            contractMissingParameterIds: [],
            assumptionParameterIds: ["area_m2"],
            invalidParameterIds: [],
          } as never}
          onRefineCanonicalParameters={onRefineCanonicalParameters}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
          onApplyParamBatch={noop}
        />,
      );
    });

    expect(renderer.root.findAllByProps({ testID: "request-estimate-parameter-panel" })).toHaveLength(0);
    act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    expect(onRefineCanonicalParameters).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-panel" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.value).toBe("987");

    act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    expect(renderer.root.findAllByProps({ testID: "request-estimate-parameter-panel" })).toHaveLength(0);
  });

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
