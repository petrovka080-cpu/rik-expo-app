import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import {
  REQUEST_ESTIMATE_CATEGORY_FILTERS,
  RequestEstimateItemsEditor,
} from "../../src/features/consumerRepair/RequestEstimateItemsEditor";
import type { RequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

type FilterKind = "material" | "labor" | "equipment" | "service" | "delivery";

function item(index: number, kind: FilterKind): ConsumerRepairRequestItem {
  return {
    id: `${kind}-${index}`,
    requestDraftId: "category-filter-draft",
    itemType: kind === "material" ? "material" : kind === "labor" ? "work" : "service",
    titleRu: `Точная позиция ${kind} ${index}`,
    quantity: 1,
    unit: "item",
    unitPrice: null,
    totalPrice: null,
    currency: "KGS",
    source: "ai_suggested",
    category: kind,
    sourceParameters: { rowKind: kind },
    editableByConsumer: true,
    createdAt: "2026-09-04T00:00:00.000Z",
  };
}

function viewModel45(): RequestEstimateViewModel {
  const items = (["material", "labor", "equipment", "service", "delivery"] as const)
    .flatMap((kind) => Array.from({ length: 9 }, (_, index) => item(index, kind)));
  return {
    title: "Смета",
    summary: "",
    totalLabel: "Итого не рассчитано",
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
    sections: [{ id: "professional_test", title: "Служебный этап", items }],
    professionalPreview: true,
    previewSections: [],
    calculationPreviewLines: [],
    normSourcePreviewLines: [],
    rawItemCount: 45,
    manualCatalogItems: [],
  };
}

function renderEditor(): ReactTestRenderer {
  const noop = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <RequestEstimateItemsEditor
        viewModel={viewModel45()}
        onDecrease={noop}
        onIncrease={noop}
        onQuantityChange={noop}
        onUnitPriceChange={noop}
        onSpecificationChange={noop}
        onRemove={noop}
        onAddManual={noop}
      />,
    );
  });
  return renderer;
}

function visibleRowCount(renderer: ReactTestRenderer): number {
  return new Set(renderer.root.findAll((node) =>
    typeof node.props.testID === "string"
      && node.props.testID.startsWith("request-estimate-item-anchor-"),
  ).map((node) => node.props.testID as string)).size;
}

describe("durable request estimate category filters", () => {
  it("keeps category controls and final estimate actions stacked from top to bottom", () => {
    const editorSource = readFileSync(
      path.resolve(__dirname, "../../src/features/consumerRepair/RequestEstimateItemsEditor.tsx"),
      "utf8",
    );
    const screenStyles = readFileSync(
      path.resolve(__dirname, "../../src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts"),
      "utf8",
    );
    expect(editorSource).toMatch(/categoryFilters:\s*\{\s*alignItems: "stretch",\s*gap: 6,/u);
    expect(editorSource).not.toMatch(/categoryFilters:\s*\{[^}]*flexDirection: "row"/su);
    expect(screenStyles).toMatch(/bottomActions:\s*\{\s*flexDirection: "column",\s*alignItems: "stretch",/u);
  });

  it("keeps all six compact controls and filters 45 rows without changing the canonical count", () => {
    const renderer = renderEditor();
    expect(REQUEST_ESTIMATE_CATEGORY_FILTERS.map((filter) => filter.label)).toEqual([
      "Все",
      "Материалы",
      "Работы",
      "Механизмы",
      "Услуги",
      "Доставка",
    ]);
    expect(visibleRowCount(renderer)).toBe(45);
    expect(renderer.root.findByProps({ testID: "request-estimate-items-total-count" }).props.children)
      .toBe("45 позиций");

    act(() => renderer.root.findByProps({ testID: "request-estimate-category-filter-all" }).props.onPress());
    expect(visibleRowCount(renderer)).toBe(0);
    act(() => renderer.root.findByProps({ testID: "request-estimate-category-filter-all" }).props.onPress());
    expect(visibleRowCount(renderer)).toBe(45);

    for (const id of ["materials", "labor", "machinery", "services", "delivery"] as const) {
      act(() => renderer.root.findByProps({ testID: `request-estimate-category-filter-${id}` }).props.onPress());
      expect(visibleRowCount(renderer)).toBe(36);
      expect(renderer.root.findByProps({ testID: `request-estimate-category-filter-${id}` })
        .props.accessibilityState).toEqual({ selected: false });
      act(() => renderer.root.findByProps({ testID: `request-estimate-category-filter-${id}` }).props.onPress());
      expect(visibleRowCount(renderer)).toBe(45);
      expect(renderer.root.findByProps({ testID: `request-estimate-category-filter-${id}` })
        .props.accessibilityState).toEqual({ selected: true });
    }

    act(() => renderer.root.findByProps({ testID: "request-estimate-category-filter-materials" }).props.onPress());
    act(() => renderer.root.findByProps({ testID: "request-estimate-category-filter-labor" }).props.onPress());
    expect(visibleRowCount(renderer)).toBe(27);
    act(() => renderer.root.findByProps({ testID: "request-estimate-category-filter-all" }).props.onPress());
    expect(visibleRowCount(renderer)).toBe(45);
    expect(renderer.root.findAll((node) =>
      typeof node.props.testID === "string" && node.props.testID.startsWith("request-estimate-section-"),
    )).toHaveLength(0);
  });

  it("shows the position name once normally and one editable name field while editing", () => {
    const row = item(1, "material");
    const onSpecificationChange = jest.fn();
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={row}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onSpecificationChange={onSpecificationChange}
          onRemove={noop}
        />,
      );
    });

    expect(renderer.root.findAllByType(Text).filter((node) => node.props.children === row.titleRu)).toHaveLength(1);
    expect(renderer.root.findAllByType(Text).filter((node) => node.props.children === "Материал")).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: `consumer-repair-item-specification-input-${row.id}` }))
      .toHaveLength(0);

    act(() => renderer.root.findByProps({ testID: `consumer-repair-item-specification-edit-${row.id}` }).props.onPress());
    expect(renderer.root.findAllByProps({ testID: `consumer-repair-item-title-${row.id}` })).toHaveLength(0);
    let input = renderer.root.findByProps({ testID: `consumer-repair-item-specification-input-${row.id}` });
    expect(input.type).toBe(TextInput);
    expect(input.props.value).toBe(row.titleRu);

    act(() => {
      renderer.update(
        <ConsumerRepairItemRow
          item={{ ...row, quantity: 2, unitPrice: 50 }}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onSpecificationChange={onSpecificationChange}
          onRemove={noop}
        />,
      );
    });
    expect(renderer.root.findAllByProps({ testID: `consumer-repair-item-title-${row.id}` })).toHaveLength(0);
    input = renderer.root.findByProps({ testID: `consumer-repair-item-specification-input-${row.id}` });
    expect(input.props.value).toBe(row.titleRu);

    act(() => input.props.onChangeText("Новое точное название"));
    act(() => renderer.root.findByProps({ testID: `consumer-repair-item-specification-save-${row.id}` }).props.onPress());
    expect(onSpecificationChange).toHaveBeenCalledWith(row.id, "Новое точное название");
  });
});
