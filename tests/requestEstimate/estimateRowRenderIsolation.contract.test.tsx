import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { RequestEstimateItemsEditor } from "../../src/features/consumerRepair/RequestEstimateItemsEditor";
import * as viewModels from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

function fixture(): ConsumerRepairDraftBundle {
  const createdAt = "2026-10-02T00:00:00.000Z";
  const items: ConsumerRepairRequestItem[] = Array.from({ length: 16 }, (_, index) => ({
    id: `render-row-${index}`, requestDraftId: "render-test-draft", itemType: "material",
    titleRu: `Песок для основания ${index + 1}`, quantity: 14.25, unit: "m3", unitLabel: "м³",
    unitPrice: null, totalPrice: null, currency: "KGS", source: "ai_suggested",
    quantityFormula: "length * width * depth", editableByConsumer: true, createdAt,
    sourceParameters: { rowCode: `render:bedding:${index}`, smartEstimateProjectionV2: { stage: "Основание" } },
  }));
  return {
    draft: { id: "render-test-draft", consumerUserId: "render-test-user", title: "Основание",
      status: "draft", repairType: "construction", missingData: [], createdAt },
    items, media: [], pdfs: [], projectExecutionDrafts: [], events: [],
    marketplaceLink: { id: "render-test-link", requestDraftId: "render-test-draft", status: "not_sent", createdAt },
  };
}

function displayed(bundle: ConsumerRepairDraftBundle) {
  return viewModels.buildRequestEstimateViewModel(bundle)!.sections.flatMap(section => section.items);
}

describe("estimate row render isolation without cached admission or quantities", () => {
  it("retains unchanged row references after public naming instead of defeating React.memo", () => {
    const bundle = fixture();
    const first = displayed(bundle);
    const second = displayed(bundle);
    expect(first).toHaveLength(16);
    first.forEach((item, index) => {
      expect(item).toBe(bundle.items[index]);
      expect(second[index]).toBe(item);
    });
  });

  it("changes only the edited display row while keeping its current manual provenance and formula baseline", () => {
    const bundle = fixture();
    const before = displayed(bundle);
    const changed: ConsumerRepairRequestItem = { ...bundle.items[2]!, quantity: 15.25,
      sourceParameters: { ...bundle.items[2]!.sourceParameters, manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25 } };
    const after = displayed({ ...bundle, items: bundle.items.map(item => item.id === changed.id ? changed : item) });
    after.forEach((item, index) => expect(item).toBe(index === 2 ? changed : before[index]));
    expect(after[2]).toMatchObject({ quantity: 15.25, sourceParameters: { manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25 } });
    expect(bundle.items[2]!.quantity).toBe(14.25);
  });

  it("does not rerender the other fifteen real rows or rebuild their evidence for one quantity edit", () => {
    const evidence = jest.spyOn(viewModels, "buildRequestEstimateProfessionalRowEvidence");
    const bundle = fixture();
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    const render = (current: ConsumerRepairDraftBundle) => <RequestEstimateItemsEditor
      viewModel={viewModels.buildRequestEstimateViewModel(current)!}
      onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop}
      onRemove={noop} onAddManual={noop} />;
    try {
      act(() => { renderer = TestRenderer.create(render(bundle)); });
      expect(evidence).toHaveBeenCalledTimes(16);
      evidence.mockClear();
      const changed = { ...bundle.items[2]!, quantity: 15.25 };
      act(() => { renderer.update(render({ ...bundle, items: bundle.items.map(item => item.id === changed.id ? changed : item) })); });
      expect(evidence).toHaveBeenCalledTimes(1);
      expect(evidence.mock.calls[0]![0].id).toBe(changed.id);
      expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-input-${changed.id}` }).props.value).toBe("15.25");
    } finally {
      act(() => renderer?.unmount());
      evidence.mockRestore();
    }
  });

  it("still projects and sanitizes a changed public title without modifying the source or other fields", () => {
    const bundle = fixture();
    const item = { ...bundle.items[0]!, titleRu: "Пользовательская строка revision" };
    const visible = displayed({ ...bundle, items: [item] })[0]!;
    expect(visible).not.toBe(item);
    expect(visible).toEqual({ ...item, titleRu: "Пользовательская строка версия" });
    expect(item.titleRu).toBe("Пользовательская строка revision");
  });

  it("does not cache old prices, source metadata, exclusions or null quantities across a new row", () => {
    const bundle = fixture();
    const original = displayed(bundle)[0]!;
    const changed: ConsumerRepairRequestItem = { ...bundle.items[0]!, quantity: null,
      unitPrice: 99, totalPrice: null, sourceParameters: { ...bundle.items[0]!.sourceParameters,
        canonicalPreliminaryNeed: true, includedInEstimate: true, includedInProcurement: false } };
    const current = { ...bundle, items: [changed] };
    expect(displayed(current)[0]).toBe(changed);
    expect(displayed(current)[0]).toMatchObject({ quantity: null, unitPrice: 99, totalPrice: null,
      sourceParameters: { canonicalPreliminaryNeed: true, includedInProcurement: false } });
    expect(viewModels.buildRequestEstimateViewModel(current)!.preliminaryNeedCount).toBe(1);
    // An unresolved need intentionally remains in the completeness ledger,
    // even when excluded. A resolved, manually excluded payable row is hidden.
    expect(displayed({ ...current, items: [{ ...changed, sourceParameters: { ...changed.sourceParameters, includedInEstimate: false } }] })).toHaveLength(1);
    expect(displayed({ ...current, items: [{ ...changed, quantity: 15.25,
      sourceParameters: { ...changed.sourceParameters, canonicalPreliminaryNeed: false, includedInEstimate: false } }] })).toHaveLength(0);
    expect(original.quantity).toBe(14.25);
  });

  it.each([0, -0, -12.34567, 0.00001, 26.30625, 1234567.89123])(
    "retains Intl's established display precision and locale for %s without rounding source quantities",
    quantity => {
      const item = { ...fixture().items[0]!, quantity };
      const expected = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(quantity);
      expect(viewModels.buildRequestEstimateProfessionalRowEvidence(item)!.formulaLabel).toContain(`${expected} м³`);
      expect(Object.is(item.quantity, quantity)).toBe(true);
    },
  );

  it("reuses at most one locale formatter across all rows and successive model builds", () => {
    const formatter = jest.spyOn(Intl, "NumberFormat");
    try {
      const bundle = fixture();
      const first = viewModels.buildRequestEstimateViewModel(bundle)!;
      const second = viewModels.buildRequestEstimateViewModel(bundle)!;
      expect(first.previewSections[0]!.rows[0]!.quantityLabel).toBe("14,25 м³");
      expect(second.previewSections).toEqual(first.previewSections);
      expect(formatter.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      formatter.mockRestore();
    }
  });
});
