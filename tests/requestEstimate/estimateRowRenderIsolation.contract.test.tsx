import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { RequestEstimateItemsEditor } from "../../src/features/consumerRepair/RequestEstimateItemsEditor";
import * as viewModels from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { appendCanonicalBackendRevisionProjection } from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";

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

  it("reuses sanitized display clones as well as rows whose source title is already public", () => {
    const bundle = fixture();
    bundle.items = bundle.items.map(item => ({ ...item, titleRu: `${item.titleRu} revision` }));
    const before = displayed(bundle);
    const after = displayed(bundle);
    before.forEach((item, index) => {
      expect(item).not.toBe(bundle.items[index]);
      expect(item.titleRu).toContain("версия");
      expect(after[index]).toBe(item);
    });
    const changed = { ...bundle.items[2]!, quantity: 15.25 };
    const edited = displayed({ ...bundle, items: bundle.items.map(item => item.id === changed.id ? changed : item) });
    edited.forEach((item, index) => expect(item === before[index]).toBe(index !== 2));
    expect(edited[2]!.quantity).toBe(15.25);
  });

  it("does not rebuild the other sanitized rows' real React evidence for one edit", () => {
    const evidence = jest.spyOn(viewModels, "buildRequestEstimateProfessionalRowEvidence");
    const bundle = fixture();
    bundle.items = bundle.items.map(item => ({ ...item, titleRu: `${item.titleRu} revision` }));
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    const render = (current: ConsumerRepairDraftBundle) => <RequestEstimateItemsEditor
      viewModel={viewModels.buildRequestEstimateViewModel(current)!}
      onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop}
      onRemove={noop} onAddManual={noop} />;
    try {
      act(() => { renderer = TestRenderer.create(render(bundle)); });
      evidence.mockClear();
      const changed = { ...bundle.items[2]!, quantity: 15.25 };
      act(() => { renderer.update(render({ ...bundle, items: bundle.items.map(item => item.id === changed.id ? changed : item) })); });
      expect(evidence).toHaveBeenCalledTimes(1);
      expect(evidence.mock.calls[0]![0].quantity).toBe(15.25);
    } finally { act(() => renderer?.unmount()); evidence.mockRestore(); }
  });

  it("never reuses stale shallow fields from a legacy in-place source mutation", () => {
    const bundle = fixture();
    const item = bundle.items[0]!;
    item.titleRu += " revision";
    const before = displayed(bundle)[0]!;
    item.quantity = null;
    item.unitPrice = 99;
    item.totalPrice = null;
    item.sourceLabel = "Новый источник";
    const after = displayed(bundle)[0]!;
    expect(after).not.toBe(before);
    expect(after).toMatchObject({ quantity: null, unitPrice: 99, totalPrice: null, sourceLabel: "Новый источник" });
    delete item.sourceLabel;
    const removed = displayed(bundle)[0]!;
    expect(removed).not.toHaveProperty("sourceLabel");
    expect(removed).not.toBe(after);
  });

  it("reuses an admitted concise canonical title but still rejects a changed projection or checksum", () => {
    const bundle = fixture();
    const revisionId = "a7b4d713-d7d9-4d33-a506-690051d375db";
    const releaseId = "d30e2f0d-e55f-5d06-abef-c7cb80d69a73";
    const catalogId = "canonical-work:bridge-asphalt:render-test";
    const verbose = "нижний слой: горячая плотная мелкозернистая асфальтобетонная смесь типа А по КРЕР 27-06-020-01 + 27-06-021-01 при принятой толщине; марка и состав уточняются проектом и паспортом завода";
    bundle.items = bundle.items.map(item => ({ ...item, titleRu: verbose, sourceParameters: {
      ...item.sourceParameters, rowSha256: "a".repeat(64), canonicalBackendRevisionId: revisionId,
      canonicalBackendReleaseId: releaseId, canonicalBackendCatalogId: catalogId, canonicalBackendOwnershipStatus: "OWNED",
    } }));
    const canonical = appendCanonicalBackendRevisionProjection({ previousBundle: null, nextBundle: bundle,
      payload: { inputText: "Тест отображения", workKey: catalogId, canonicalBackend: {
        compilerOwner: "backend", revisionId, revisionNumber: 1, parentRevisionId: null,
        releaseId, catalogId, createdAt: "2026-10-02T00:00:00.000Z", checksumSha256: "b".repeat(64), parameters: {},
      } } as never });
    const accepted = displayed(canonical);
    expect(accepted[0]!.titleRu).toBe("Нижний слой: асфальтобетонная смесь типа А");
    expect(displayed(canonical)[0]).toBe(accepted[0]);
    const current = canonical.estimateDraftRevisionState!.revisions[0]!;
    const altered = { ...current, boq: { ...current.boq, rows: current.boq.rows.map((row, index) => index === 0 ? { ...row, quantity: 999 } : row) } };
    const rejected = displayed({ ...canonical, estimateDraftRevisionState: { ...canonical.estimateDraftRevisionState!, revisions: [altered] } });
    expect(rejected[0]!.titleRu).toContain("при принятой толщине");
    const invalidIdentity = { ...current, resolvedIdentity: { ...current.resolvedIdentity!, checksum: "invalid" } };
    expect(displayed({ ...canonical, estimateDraftRevisionState: { ...canonical.estimateDraftRevisionState!, revisions: [invalidIdentity] } })[0]!.titleRu).toContain("при принятой толщине");
    expect(canonical.items[0]!.titleRu).toBe(verbose);
    expect(displayed(canonical)[0]!.titleRu).toBe("Нижний слой: асфальтобетонная смесь типа А");
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
