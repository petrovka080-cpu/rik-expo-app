import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel, buildCanonicalProcurementPreviewRows } from "./ConsumerRepairProgressiveEstimatePanel";

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

describe("canonical procurement preview remount", () => {
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
