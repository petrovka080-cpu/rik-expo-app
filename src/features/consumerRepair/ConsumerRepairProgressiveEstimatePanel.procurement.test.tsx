import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel, buildCanonicalProcurementPreviewRows } from "./ConsumerRepairProgressiveEstimatePanel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests/consumerRequestTypes";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";

type ProgressiveEstimateViewModel = React.ComponentProps<
  typeof ConsumerRepairProgressiveEstimatePanel
>["viewModel"];

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const viewModel = {
  title: "Монтаж анкерной группы",
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
} as ProgressiveEstimateViewModel;

function revision(procurementReady: boolean) {
  const revisionId = "revision-anchor-52";
  return {
    revisionId,
    canonicalRevisionNumber: 25,
    missingInputs: [],
    inputParams: {},
    boq: {
      sections: [],
      rows: [{
        rowId: "material:anchor-group:anchor-bolts",
        titleRu: "Анкерные болты AG-M42-HL",
        quantity: 52,
        unit: "piece",
        unitLabel: "шт.",
        unitPrice: null,
        currency: "KGS",
        includedInProcurement: true,
        sourceParameters: {},
      }],
    },
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
      procurementArtifactId: procurementReady ? "procurement-artifact-52" : null,
      procurementValidForRevisionId: procurementReady ? revisionId : null,
    },
  } as never;
}

function panel(
  currentRevision: ReturnType<typeof revision>,
  model = viewModel,
) {
  const noop = jest.fn();
  return (
    <ConsumerRepairProgressiveEstimatePanel
      viewModel={model}
      revisionState={null}
      currentRevision={currentRevision}
      latestDiff={null}
      onOpenProcurement={noop}
      onDecrease={noop}
      onIncrease={noop}
      onQuantityChange={noop}
      onUnitPriceChange={noop}
      onRemove={noop}
      onAddManual={noop}
      onAddCustom={noop}
    />
  );
}

it("preserves the actual tray mortar ratio in Buyer projection and rendered rows without rewriting the saved revision", () => {
  const current = revision(true) as unknown as EstimateDraftRevision;
  const row = current.boq.rows[0];
  const rowId = "precast-rc-embankment-runoff-tray:mortar";
  Object.assign(row, {
    rowId, rowType: "material", quantity: 0.017, unit: "m3", unitLabel: "м³",
    titleRu: "Раствор готовый отделочный тяжёлый, цементный 1:3 — CONTROL_ONLY: Раствор готовый отделочный тяжёлый, цементный 1:3 по проекту и фактической поставке в м³; не данные объекта",
    sourceParameters: { canonicalPurchaseBalance: {
      ownerRowId: rowId, unitId: "m3", consumed: "0.01633", stock: "0", reserve: "0",
      effectiveOrder: "0.017", remaining: "0.00067", freeBeyondReserve: "0.00067",
      consumptionShortage: "0", reserveDeficit: "0", quantum: "0.001", quantityMode: "supply_quantum",
    } },
  });
  const before = JSON.stringify(current);
  const projected = buildCanonicalProcurementPreviewRows(current);
  expect(projected).toHaveLength(1);
  expect(projected[0].titleRu.match(/1:3/gu)).toHaveLength(2);
  expect(projected[0].titleRu).not.toContain("1 — 3");
  expect(projected[0].quantity).toBe("0.017");
  expect(projected[0].quantityDetails).toEqual([
    "Расход: 0,01633 м³", "В наличии: 0 м³", "Сохраняемый резерв: 0 м³",
    "Остаток после расхода: 0,00067 м³", "Шаг поставки: 0,001 м³",
  ]);
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(panel(current as never)); });
  act(() => renderer.root.findByProps({ testID: "consumer-estimate-open-procurement" }).props.onPress());
  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain("цементный 1:3");
  expect(rendered).not.toContain("1 — 3");
  expect(rendered).toContain("К закупке: 0,017 м³");
  expect(JSON.stringify(current)).toBe(before);
  act(() => renderer.unmount());
});

describe("canonical procurement preview remount", () => {
  it("shows saved preliminary consumption even when no order or priced row is ready", () => {
    const current = revision(false) as unknown as NonNullable<Parameters<typeof buildCanonicalProcurementPreviewRows>[0]>;
    current.boq.rows = [];
    const item: ConsumerRepairRequestItem = {
      id: "need:membrane", requestDraftId: "draft", itemType: "material", titleRu: "Мембрана ПВХ 1,5 мм",
      quantity: null, unit: "m2", unitLabel: "м²", unitPrice: null, totalPrice: null, currency: "KGS",
      source: "ai_suggested", editableByConsumer: true, createdAt: "2026-10-08T00:00:00.000Z",
      sourceParameters: { rowCode: "membrane", canonicalBackendRevisionId: current.revisionId,
        canonicalPreliminaryNeed: true, includedInProcurement: true,
        canonicalPurchaseRequirement: { version: "canonical-purchase-requirement:v1", ownerRowId: "membrane", unitId: "m2",
          consumed: "86.25", plannedConsumption: null, conditional: false, preliminaryParameterIds: ["membrane_consumption"] } },
    };
    const saved = JSON.stringify({ current, item });
    const preview = buildCanonicalProcurementPreviewRows(current, [item, item]);
    expect(preview).toHaveLength(1);
    expect(preview[0]).toMatchObject({ quantity: null, unitPrice: null, preliminary: true,
      quantityDetails: ["Предварительный расход: 86,25 м²"] });
    expect(buildCanonicalProcurementPreviewRows(current, [{ ...item, sourceParameters: { ...item.sourceParameters, canonicalBackendRevisionId: "other" } }])).toEqual([]);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(panel(current as never, { ...viewModel,
      sections: [{ id: "materials", title: "Материалы", items: [item] }], rawItemCount: 1,
    })); });
    act(() => renderer.root.findByProps({ testID: "consumer-estimate-open-procurement" }).props.onPress());
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Предварительный расход: 86,25 м²");
    expect(rendered).toContain("Точный заказ требует уточнения");
    expect(rendered).not.toContain("К закупке: 0");
    expect(JSON.stringify({ current, item })).toBe(saved);
    act(() => renderer.unmount());
  });

  it("does not present a withdrawn saved estimate as technically or commercially ready", () => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<RequestEstimateSummaryCard viewModel={viewModel}
      missingParameterCount={0} contentWithdrawalReasonRu="Паспорт фонарей ошибочно содержал фасадное остекление." />); });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Сохранённый расчёт требует исправления");
    expect(rendered).not.toContain("Обязательные параметры заполнены");
    expect(renderer.root.findAllByProps({ testID: "request-estimate-trust-level" })).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it("shows the persisted order and physical balance without recomputing an amended order", () => {
    const current = revision(true) as unknown as Parameters<typeof buildCanonicalProcurementPreviewRows>[0];
    const row = current!.boq.rows[0];
    row.unit = "m2";
    row.unitLabel = "м²";
    row.quantity = 157.5;
    row.materialQuantity = { procurementQuantity: 999 } as never;
    row.sourceParameters = { canonicalPurchaseBalance: {
      ownerRowId: row.rowId, unitId: "m2", consumed: "116.15", stock: "0", reserve: "0",
      effectiveOrder: "157.5", remaining: "41.35", freeBeyondReserve: "41.35",
      consumptionShortage: "0", reserveDeficit: "0", quantum: "52.5", quantityMode: "supply_quantum",
    } };
    const saved = JSON.stringify(current);
    const preview = buildCanonicalProcurementPreviewRows(current);
    expect(preview[0].quantity).toBe("157.5");
    expect(preview[0].quantityDetails).toEqual([
      "Расход: 116,15 м²", "В наличии: 0 м²", "Сохраняемый резерв: 0 м²",
      "Остаток после расхода: 41,35 м²", "Шаг поставки: 52,5 м²",
    ]);
    expect(JSON.stringify(current)).toBe(saved);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(panel(current as never)); });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("К закупке: 157,5 м²");
    expect(rendered).toContain("Расход: 116,15 м²");
    expect(rendered).not.toContain("999");
    act(() => renderer.unmount());
  });

  it("keeps small and large exact orders and does not present an order-scoped balance as physical stock", () => {
    const current = revision(true) as unknown as Parameters<typeof buildCanonicalProcurementPreviewRows>[0];
    const row = current!.boq.rows[0];
    row.unit = "m3";
    row.sourceParameters = { canonicalPurchaseBalance: {
      ownerRowId: row.rowId, unitId: "m3", consumed: "0.0000001", stock: "0", reserve: "0",
      effectiveOrder: "9007199254740993.125", remaining: "0", freeBeyondReserve: "0",
      consumptionShortage: "0", reserveDeficit: "0", quantum: null,
      quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
      plannedConsumption: "0.0000001", requirementBasis: "selected_supply_order",
    } };
    const preview = buildCanonicalProcurementPreviewRows(current)[0];
    expect(preview.quantity).toBe("9007199254740993.125");
    expect(preview.quantityDetails).toEqual(["Исходная потребность к заказу: 0,0000001 м³"]);
    expect(preview.quantityDetails.join(" ")).not.toMatch(/В наличии|Расход|Шаг поставки/);
  });

  it("rejects a saved balance from another owner instead of falling back to a reconstructed quantity", () => {
    const current = revision(true) as unknown as Parameters<typeof buildCanonicalProcurementPreviewRows>[0];
    current!.boq.rows[0].sourceParameters = { canonicalPurchaseBalance: { ownerRowId: "other-row" } };
    expect(() => buildCanonicalProcurementPreviewRows(current)).toThrow("saved purchase balance invalid");
  });

  it("opens when the current revision receives its procurement artifact", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(false)));
    });
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);

    act(() => renderer.update(panel(revision(true))));

    expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "request-estimate-positions-panel" }))
      .toHaveLength(0);
  });

  it("restores the open preview from a ready artifact after a parent remount", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true)));
    });

    expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" }))
      .toBeTruthy();
    expect(renderer.root.findByProps({
      testID: "consumer-estimate-procurement-row-material:anchor-group:anchor-bolts",
    })).toBeTruthy();
  });

  it("keeps a user-opened positions panel in front of the procurement preview", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true)));
    });

    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-positions-toggle" }).props.onPress();
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-positions-panel" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);
  });

  it("shows every position by default when the estimate has no preliminary needs", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true), {
        ...viewModel,
        preliminaryNeedCount: 0,
      } as never));
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-positions-panel" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);
  });
});
