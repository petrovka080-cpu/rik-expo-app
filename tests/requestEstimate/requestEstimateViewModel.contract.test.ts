import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { createConsumerEstimatePresentationTrace, type ConsumerEstimateHydrationPhaseEvent } from "../../src/lib/consumerRequests/consumerEstimateHydrationTrace";
import { compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage } from '../../src/lib/platform/compactConsumerRepairDurableState';
import {
  foundationDraftWithManualCatalogItem,
  foundationViewModel,
} from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate view model", () => {
  it('preserves a compact historical sum without treating unloaded rows as missing prices', () => {
    const source = foundationDraftWithManualCatalogItem();
    const vm = buildRequestEstimateViewModel({ ...source, items: [], durableHistorySummary: {
      schemaVersion: 'consumer_repair_durable_history_summary_v1', rowCount: 12, materialRowsCount: 8, workRowsCount: 4,
      totalPrice: 17000, currency: 'KGS', sourceRevisionId: 'saved-revision', sourceSnapshotId: 'saved-snapshot',
      rowsHash: null, totalsHash: null, fullSnapshotHash: null, pdfArtifactId: null, buyerHandoffId: null,
      compactedAt: '2026-10-06T00:00:00Z', fullSnapshotAvailable: true,
    } });
    expect(vm?.totalLabel).toMatch(/17\s?000/u);
    expect(vm?.totalLabel).not.toContain('не рассчитана');
    const compactedUnpriced = compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage({ ...source,
      items: source.items.map(item => ({ ...item, unitPrice: null, totalPrice: null })) });
    expect(compactedUnpriced.items).toHaveLength(0);
    expect(compactedUnpriced.durableHistorySummary?.totalPrice).toBe(0);
    const unknown = buildRequestEstimateViewModel(compactedUnpriced);
    expect(unknown?.totalLabel).toBe('Стоимость не рассчитана');
  });
  it('shows known amounts as partial and distinguishes unpriced rows from explicit zero', () => {
    const source = foundationDraftWithManualCatalogItem();
    const items = source.items.map((item, index) => ({ ...item, unitPrice: index === 0 ? 0 : null,
      totalPrice: index === 0 ? 0 : null, sourceParameters: { ...item.sourceParameters, includedInEstimate: true } }));
    const vm = buildRequestEstimateViewModel({ ...source, items });
    expect(vm?.totalLabel).toContain('Стоимость рассчитана частично');
    const unpriced = buildRequestEstimateViewModel({ ...source, items: items.map(item => ({ ...item, unitPrice: null, totalPrice: null })) });
    expect(unpriced?.totalLabel).toBe('Стоимость не рассчитана');
  });
  it("groups request draft positions into localized professional sections", () => {
    const vm = foundationViewModel();
    expect(vm?.title).toBe("ленточный фундамент");
    expect(vm?.summary).toContain("Ленточный фундамент");
    expect(vm?.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Материалы", "Работы", "Услуги / логистика"]));
  });
  it("hides a backend-excluded row while preserving it in the restorable bundle", () => {
    const source = foundationDraftWithManualCatalogItem();
    const removed = source.items[0]!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === removed.id
        ? {
          ...item,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            includedInEstimate: false,
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);
    const visibleIds = vm?.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];

    expect(bundle.items).toHaveLength(source.items.length);
    expect(visibleIds).not.toContain(removed.id);
    expect(vm?.rawItemCount).toBe(source.items.length - 1);
  });

  it("keeps a required non-payable composition row visible without making it costed", () => {
    const source = foundationDraftWithManualCatalogItem();
    const component = source.items[0]!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === component.id
        ? {
          ...item,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            includedInEstimate: false,
            includedInProcurement: false,
            payable: false,
            canonicalCostTreatment: "INCLUDED_IN_RESOURCE_ROWS",
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);
    const visibleIds = vm?.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];

    expect(visibleIds).toContain(component.id);
    expect(vm?.rawItemCount).toBe(source.items.length);
    expect(vm?.priceStatusLabel).toContain(`/${source.items.length - 1} `);
  });

  it("keeps a quantified preliminary material in the calculated and procurement scope", () => {
    const source = foundationDraftWithManualCatalogItem();
    const material = source.items.find((item) => item.itemType === "material")!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === material.id
        ? {
          ...item,
          quantity: 32.1,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            canonicalPreliminaryNeed: true,
            canonicalPreliminaryNeedState: "CONDITION_REQUIRED",
            includedInEstimate: true,
            includedInProcurement: true,
            procurementEligible: true,
            payable: false,
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);

    expect(vm?.calculatedItemCount).toBe(source.items.length);
    expect(vm?.preliminaryNeedCount).toBe(1);
    expect(vm?.trustLevelLabel).toBe("Готовность: нужны уточнения");
    expect(vm?.priceStatusLabel).toContain("1 с предварительным количеством");
    expect(vm?.priceStatusLabel).not.toContain("1 без количества");
    expect(vm?.procurementApplicabilityLabel).toBeNull();
    expect(vm?.previewSections.flatMap((section) => section.rows)).toContainEqual(
      expect.objectContaining({
        calculationLabel: "Предварительное количество рассчитано; уточните характеристики или условия",
      }),
    );
  });
  it("attributes first model phases without changing output, input, or later quantity/price edits", () => {
    const source = foundationDraftWithManualCatalogItem();
    const original = JSON.stringify(source);
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimatePresentationTrace({ clock: () => 0, report: event => { events.push(event); } });
    const baseline = buildRequestEstimateViewModel(source);
    expect(buildRequestEstimateViewModel(source, trace)).toEqual(baseline);
    expect(events.map(event => event.phase)).toEqual([
      "PRESENTATION_PUBLIC_TITLE_ADMISSION", "PRESENTATION_PUBLIC_ROW_SECTIONS", "PRESENTATION_VISIBLE_LINES",
      "PRESENTATION_PREVIEW_SECTIONS", "PRESENTATION_CALCULATION_PREVIEW", "PRESENTATION_NORM_SOURCE_PREVIEW",
    ]);
    expect(JSON.stringify(source)).toBe(original);
    const manual = source.items.find(item => item.source === "catalog_item")!;
    const changed = { ...source, items: source.items.map(item => item.id === manual.id
      ? { ...item, quantity: 7, totalPrice: 35000 } : item) };
    const current = buildRequestEstimateViewModel(changed, trace);
    expect(current).toEqual(buildRequestEstimateViewModel(changed));
    expect(current?.manualCatalogItems.find(item => item.id === manual.id)?.quantity).toBe(7);
    expect(events).toHaveLength(6);
    expect(JSON.stringify(source)).toBe(original);
    expect(JSON.stringify(events)).not.toMatch(/titleRu|quantity|sourceParameters|requestDraftId/u);
  });
  it("does not consume first populated model measurements while no bundle exists", () => {
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimatePresentationTrace({ clock: () => 0, report: event => { events.push(event); } });
    expect(buildRequestEstimateViewModel(null, trace)).toBeNull();
    expect(events).toHaveLength(0);
    expect(buildRequestEstimateViewModel(foundationDraftWithManualCatalogItem(), trace)).not.toBeNull();
    expect(events).toHaveLength(6);
  });
});
