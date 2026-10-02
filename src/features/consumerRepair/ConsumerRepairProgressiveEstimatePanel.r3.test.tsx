import React from "react";
import { Keyboard, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  buildConsumerRepairProgressiveParameterCards,
  canonicalConsumerEditableFieldValue,
  canonicalConsumerParameterInlineGuide,
  canonicalConsumerParameterPlaceholder,
  ConsumerRepairDraftQuickActions,
  ConsumerRepairProgressiveEstimatePanel,
  InlineParamEditor,
  ParameterDisclosurePanel,
} from "./ConsumerRepairProgressiveEstimatePanel";
import { EstimateMaterialSearchAddControl } from "./RequestEstimateItemsEditor";
import { ConsumerRepairItemRow } from "./ConsumerRepairItemRow";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("InlineParamEditor R3 parameter guide", () => {
  it("keeps an application profile value filled, editable and visibly sourced", () => {
    expect(canonicalConsumerEditableFieldValue({
      cardValue: 0.12,
      revisionValue: 0.12,
      parameter: {
        source: "ASSUMED",
        referenceValue: 0.12,
      } as never,
    })).toBe("0.12");
    expect(canonicalConsumerParameterPlaceholder({
      parameter: {
        source: "ASSUMED",
        referenceValue: 0.12,
      } as never,
      baselineDisplay: "0,12 чел.-ч/м³",
    })).toBe("Предварительно принято: 0,12 чел.-ч/м³");
    expect(canonicalConsumerEditableFieldValue({
      cardValue: 0.15,
      revisionValue: 0.15,
      parameter: {
        source: "USER_EXPLICIT",
        referenceValue: 0.12,
      } as never,
    })).toBe("0.15");
  });

  it("distinguishes a preliminary value, an equipment passport value and an object measurement", () => {
    expect(canonicalConsumerParameterInlineGuide({
      parameter: { source: "ASSUMED", normativeSource: { sourceId: "qa-plan" } } as never,
      baselineValue: "1000",
      guideKind: "REFERENCE_GUIDANCE",
    })).toBe("принято 1 000");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: { source: "NORMATIVE_DERIVED", normativeSource: { sourceId: "passport" } } as never,
      baselineValue: "1.5",
      guideKind: "MANUFACTURER_GUIDANCE",
    })).toBe("паспорт 1,5");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: { source: "TEXT_EXTRACTED", normativeSource: null } as never,
      baselineValue: "5000",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("чертёж/обмер");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: { source: "ASSUMED", normativeSource: { sourceId: "method" } } as never,
      baselineValue: "1",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("принято 1");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: { source: "NORMATIVE_DERIVED", normativeSource: { sourceId: "pds" } } as never,
      baselineValue: "0.5",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("норма 0,5");
  });

  it("never presents an empty or zero reference as a norm and tells where to obtain construction values", () => {
    const laborParameter = {
      parameterId: "placement_worker_h",
      unit: "man_hour",
      source: "NORMATIVE_DERIVED",
      normativeSource: { sourceId: "work-pack" },
    } as never;
    expect(canonicalConsumerParameterInlineGuide({
      parameter: laborParameter,
      baselineValue: "",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("из КРЕР/ППР");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: laborParameter,
      baselineValue: "0",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("из КРЕР/ППР");
    expect(canonicalConsumerParameterInlineGuide({
      parameter: {
        parameterId: "plan_dimension_concrete_volume_m3",
        unit: "m3",
        source: "PROJECT_SPECIFIC",
        normativeSource: null,
      } as never,
      baselineValue: "",
      guideKind: "MEASUREMENT_RULE",
    })).toBe("чертёж/обмер");
  });

  it.each([
    ["concrete_class", "Например: B25"],
    ["watertightness", "Например: W6"],
    ["frost_resistance", "Например: F150"],
    ["mobility", "Например: П4 (P4)"],
  ])("shows a project-only format example inside %s input", (parameterId, example) => {
    expect(canonicalConsumerParameterPlaceholder({
      parameter: {
        parameterId,
        valueType: "string",
        validation: {},
        source: "PROJECT_SPECIFIC",
        normativeSource: null,
      } as never,
      baselineDisplay: "",
    })).toBe(`${example} — укажите значение из проекта или спецификации, не применяйте пример как норму.`);
  });

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

  it("renders a server-confirmed line photo without exposing a signed thumbnail URL", () => {
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={{
            id: "request-item-photo-server",
            requestDraftId: "draft-photo-server",
            itemType: "material",
            titleRu: "Бетон",
            quantity: 22,
            unit: "м³",
            unitPrice: null,
            totalPrice: null,
            currency: "KGS",
            source: "reference_price_book",
            sourceParameters: { rowCode: "canonical-material-row-photo-server" },
            editableByConsumer: true,
            createdAt: "2026-09-29T00:00:00.000Z",
          }}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          hasPhotoAttachment
          showPhotoButton
        />,
      );
    });

    expect(renderer.root.findByProps({
      testID: "estimate-material-row-photo-attached-canonical-material-row-photo-server",
    })).toBeTruthy();
    expect(renderer.root.findAllByProps({
      testID: "estimate-material-row-photo-view-canonical-material-row-photo-server",
    })).toHaveLength(0);
  });

  it("shows estimate and material-only catalog sections in the unified control", () => {
    const onSelectExisting = jest.fn();
    const onSelectCatalogItem = jest.fn();
    const existingMatch = {
      itemId: "estimate-row-1",
      titleRu: "Арматура A500C",
      categoryFilterId: "materials" as const,
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
    const dismissKeyboard = jest.spyOn(Keyboard, "dismiss");
    dismissKeyboard.mockClear();
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
              parameterId: "excavator_productivity_m3_h",
              label: "Производительность экскаватора",
              description: "Предварительная производительность механизма",
              value: 35,
              referenceValue: 35,
              valueType: "number",
              unit: "м³/ч",
              requiredLevel: "CONTRACT_REQUIRED",
              visibilityCondition: { kind: "ALWAYS" },
              validation: { min: 1 },
              allowedValues: [],
              source: "ASSUMED",
              state: "ASSUMED",
              confidence: 0.7,
              assumption: "Предварительно принято из исходного запроса.",
              affectsRows: ["earthworks:excavator"],
              affectsFormula: ["earthworks:excavator:formula"],
              normativeSource: null,
              displayOrder: 1,
              sourceText: "Из исходного запроса",
              valid: true,
              validationIssues: [],
            }],
            blockingMissingParameterIds: [],
            contractMissingParameterIds: [],
            assumptionParameterIds: ["excavator_productivity_m3_h"],
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
    expect(dismissKeyboard).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-panel" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.value).toBe("35");
    expect(renderer.root.findByProps({
      testID: "editable-param-inline-guide-excavator_productivity_m3_h",
    }).props.children).toBe("принято 35");
    expect(renderer.root.findByProps({ testID: "editable-param-chip-excavator_productivity_m3_h" })
      .findAllByType("Text" as never)
      .map((node) => String(node.props.children ?? ""))
      .join(" ")).toContain("№ 1.");
    expect(renderer.root.findByProps({
      testID: "editable-param-application-value-excavator_productivity_m3_h",
    }).props.children).toContain("Поле можно изменить");
    expect(renderer.root.findByProps({ testID: "request-estimate-assumed-parameters" })
      .findAllByType("Text" as never)
      .map((node) => String(node.props.children ?? ""))
      .join(" ")).toContain("Рассчитано или подставлено приложением — можно изменить");

    const editorInstance = renderer.root.findByType(ParameterDisclosurePanel).instance;
    act(() => renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.onChangeText("40"));
    expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.value).toBe("40");
    expect(renderer.root.findByProps({ testID: "editable-param-batch-dirty-count" })).toBeTruthy();
    act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    const hiddenSurface = renderer.root.findByProps({ testID: "request-estimate-parameter-editor-surface" });
    expect(hiddenSurface.props.style).toEqual({ display: "none" });
    expect(hiddenSurface.props.pointerEvents).toBe("none");
    expect(hiddenSurface.props.accessibilityElementsHidden).toBe(true);
    expect(hiddenSurface.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(dismissKeyboard).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType(ParameterDisclosurePanel).instance).toBe(editorInstance);
    // Collapse is not Cancel; reopening must neither rebuild the editor nor
    // discard an unapplied replacement of the automatic application value.
    for (let index = 0; index < 20; index += 1) {
      act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
      expect(renderer.root.findByProps({ testID: "request-estimate-parameter-editor-surface" }).props.style).toBeUndefined();
      expect(renderer.root.findByType(ParameterDisclosurePanel).instance).toBe(editorInstance);
      expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.value).toBe("40");
      expect(renderer.root.findByProps({ testID: "editable-param-batch-dirty-count" })).toBeTruthy();
      act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    }
    expect(onRefineCanonicalParameters).toHaveBeenCalledTimes(21);
    expect(dismissKeyboard).toHaveBeenCalledTimes(21);
    dismissKeyboard.mockRestore();
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
          embeddedGuideRu="норма 1,5–2,0"
          onChange={onChange}
        />,
      );
    });

    const input = renderer.root.findByProps({ testID: "editable-param-popover-input" });
    expect(input.props.placeholder).toBe("Введите");
    expect(input.props.placeholderTextColor).toBe("#64748B");
    expect(renderer.root.findByProps({ testID: "editable-param-inline-guide-primer_consumption" }).props.children)
      .toBe("норма 1,5–2,0");
    expect(renderer.root.findAllByProps({ testID: "editable-param-guide-primer_consumption" })).toHaveLength(0);

    act(() => input.props.onFocus());
    expect(renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.placeholder)
      .toBe("Введите");
    expect(renderer.root.findByProps({ testID: "editable-param-inline-guide-primer_consumption" }).props.children)
      .toBe("норма 1,5–2,0");

    act(() => renderer.root.findByProps({ testID: "editable-param-popover-input" }).props.onChangeText("1,7"));
    expect(onChange).toHaveBeenCalledWith("primer_consumption", "1,7");
  });
});
