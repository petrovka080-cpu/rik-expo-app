import React from "react";
import { TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  buildConsumerRepairProgressiveParameterCards,
  ConsumerRepairDraftQuickActions,
  ConsumerRepairProgressiveEstimatePanel,
  InlineParamEditor,
} from "./ConsumerRepairProgressiveEstimatePanel";
import { EstimateMaterialSearchAddControl } from "./RequestEstimateItemsEditor";
import { ConsumerRepairItemRow } from "./ConsumerRepairItemRow";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("InlineParamEditor R3 parameter guide", () => {
  it("renders an attached line photo as a viewable thumbnail bound to the canonical row", () => {
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={{
            id: "request-item-photo",
            requestDraftId: "draft-photo",
            itemType: "material",
            titleRu: "Материал с фото",
            quantity: 1,
            unit: "item",
            unitPrice: null,
            totalPrice: null,
            currency: "KGS",
            source: "ai_suggested",
            sourceParameters: { rowCode: "canonical-material-row-photo" },
            editableByConsumer: true,
            createdAt: "2026-08-19T00:00:00.000Z",
          }}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          photoThumbnailUri="file:///data/user/0/photo.jpg"
          showPhotoButton
        />,
      );
    });

    expect(renderer.root.findByProps({
      testID: "estimate-material-row-photo-attached-canonical-material-row-photo",
    })).toBeTruthy();
    expect(renderer.root.findByProps({
      testID: "estimate-material-row-photo-view-canonical-material-row-photo",
    }).props.source).toEqual({ uri: "file:///data/user/0/photo.jpg" });
  });

  it("shows estimate and material-only catalog sections in the unified control", () => {
    const onSelectExisting = jest.fn();
    const onSelectCatalogItem = jest.fn();
    const existingMatch = {
      itemId: "estimate-row-1",
      titleRu: "Арматура A500C",
      sectionId: "materials",
      sectionTitle: "Материалы",
    };
    const catalogItem = {
      catalogItemId: "catalog-material-1",
      rikCode: "MAT-001",
      name: "Арматура A500C, 12 мм",
      unit: "kg",
      kind: "material",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
    };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <EstimateMaterialSearchAddControl
          query="арматура"
          existingMatches={[existingMatch]}
          catalogRows={[catalogItem]}
          catalogLoading={false}
          catalogError={null}
          lastCatalogQuery="арматура"
          onChangeQuery={jest.fn()}
          onSubmit={jest.fn()}
          onSelectExisting={onSelectExisting}
          onSelectCatalogItem={onSelectCatalogItem}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "estimate-material-search-existing-section" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "estimate-material-search-catalog-section" })).toBeTruthy();
    act(() => renderer.root.findByProps({ testID: "estimate-material-search-existing-estimate-row-1" }).props.onPress());
    act(() => renderer.root.findByProps({ testID: "estimate-material-search-catalog-catalog-material-1" }).props.onPress());
    expect(onSelectExisting).toHaveBeenCalledWith(existingMatch);
    expect(onSelectCatalogItem).toHaveBeenCalledWith(catalogItem);
  });

  it("uses one material search/add field and carries its query into the catalog", () => {
    const onAddManual = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairDraftQuickActions
          onAddManual={onAddManual}
          onAddCustom={jest.fn()}
        />,
      );
    });

    const materialInput = renderer.root.findByType(TextInput);
    expect(materialInput.props.testID).toBe("consumer-repair-material-search-add-field");
    act(() => materialInput.props.onChangeText("  Арматура A500C  "));
    const materialButton = renderer.root.findAllByProps({ testID: "consumer-repair-add-manual-item" })[0]!;
    act(() => materialButton.props.onPress());
    expect(onAddManual).toHaveBeenCalledWith("Арматура A500C");
  });

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
