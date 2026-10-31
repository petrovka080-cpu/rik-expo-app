import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel, buildCanonicalProcurementPreviewRows } from "./ConsumerRepairProgressiveEstimatePanel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests/consumerRequestTypes";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import { buildCanonicalProcurementPreviewSections } from "./canonicalProcurementPreviewRows";

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

it("opens an explicit empty purchase list without turning normative demand into an order", () => {
  const current = revision(false) as unknown as EstimateDraftRevision;
  current.boq.rows[0].includedInProcurement = false;
  const before = JSON.stringify(current);
  const onOpenProcurement = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.cloneElement(panel(current as never), { onOpenProcurement })); });
  expect(buildCanonicalProcurementPreviewRows(current)).toEqual([]);
  expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" })).toHaveLength(0);
  act(() => renderer.root.findByProps({ testID: "consumer-estimate-open-procurement" }).props.onPress());
  expect(onOpenProcurement).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" })).toBeTruthy();
  expect(JSON.stringify(renderer.root.findByProps({ testID: "consumer-estimate-procurement-empty" }).props.children))
    .toContain("В этой версии нет рассчитанных позиций к покупке.");
  expect(renderer.root.findAll(node => typeof node.props.testID === 'string'
    && node.props.testID.startsWith('consumer-estimate-procurement-row-'))).toHaveLength(0);
  expect(JSON.stringify(current)).toBe(before);
  act(() => renderer.unmount());
});

it.each([false, true])("respects the common guard before opening a nonempty purchase list: allowed=%s", (allowed) => {
  const current = revision(false) as unknown as EstimateDraftRevision;
  const before = JSON.stringify(current);
  let renderer!: ReactTestRenderer;
  const onOpenProcurement = jest.fn(() => {
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" })).toHaveLength(0);
    return allowed;
  });
  act(() => { renderer = TestRenderer.create(React.cloneElement(panel(current as never), { onOpenProcurement })); });
  const beforeView = renderer.toJSON();
  expect(buildCanonicalProcurementPreviewRows(current)).toHaveLength(1);
  act(() => renderer.root.findByProps({ testID: "consumer-estimate-open-procurement" }).props.onPress());
  expect(onOpenProcurement).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }).length > 0).toBe(allowed);
  if (allowed) {
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-row-material:anchor-group:anchor-bolts" }).length).toBeGreaterThan(0);
  } else {
    expect(renderer.toJSON()).toEqual(beforeView);
  }
  expect(JSON.stringify(current)).toBe(before);
  act(() => renderer.unmount());
});

it("restores a saved empty purchase artifact while preserving its excluded physical demand", () => {
  const current = revision(true) as unknown as EstimateDraftRevision;
  current.boq.rows[0].includedInProcurement = false;
  const before = JSON.stringify(current);
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(panel(current as never)); });
  expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-empty" })).toBeTruthy();
  expect(buildCanonicalProcurementPreviewRows(current)).toEqual([]);
  expect(current.boq.rows[0].quantity).toBe(52);
  expect(JSON.stringify(current)).toBe(before);
  act(() => renderer.unmount());
});

it("shows saved purchasing operations with one order owner and conditional shared references, without changing the revision", () => {
  const current = revision(true) as unknown as EstimateDraftRevision;
  const owner = {
    contractVersion: "canonical-operation-resource/v1", groupId: "asphalt", groupTitleRu: "Асфальтовые работы",
    operationId: "supply", operationTitleRu: "Поставка материалов", completionCriterionRu: "Материал доставлен",
    processOrdinal: 1, additionalOperations: [
      { operationId: "lay", operationTitleRu: "Укладка покрытия", completionCriterionRu: "Слой уложен", processOrdinal: 2,
        whenResourcePresent: ["machine:paver"] },
      { operationId: "missing", operationTitleRu: "Неприменимая подработка", completionCriterionRu: "Нет ресурса",
        whenResourcePresent: ["foreign-revision-machine"] },
    ],
  };
  Object.assign(current.boq.rows[0], { rowId: "material:shared", titleRu: "Общий материал", quantity: 703,
    unit: "piece", unitPrice: 2, sourceParameters: { canonicalOperationComposition: owner } });
  current.boq.rows.push({ ...current.boq.rows[0], rowId: "machine:paver", titleRu: "Асфальтоукладчик",
    quantity: 3.19, includedInProcurement: false, sourceParameters: {} });
  const foreignItem: ConsumerRepairRequestItem = { id: "foreign-revision-machine", titleRu: "Чужой механизм",
    requestDraftId: "foreign-draft", itemType: "material", quantity: 1, unit: "piece",
    unitPrice: null, totalPrice: null, currency: "KGS", source: "ai_suggested",
    editableByConsumer: true, createdAt: "2026-10-20T00:00:00.000Z",
    sourceParameters: { rowCode: "foreign-revision-machine", canonicalBackendRevisionId: "another-revision" },
  };
  const before = JSON.stringify({ current, foreignItem });
  const rows = buildCanonicalProcurementPreviewRows(current, [foreignItem]);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ rowId: "material:shared", quantity: 703, unitPrice: 2, operation: owner });
  const sections = buildCanonicalProcurementPreviewSections(current, rows, [foreignItem]);
  expect(sections.map(section => section.operation?.operationId)).toEqual(["supply", "lay"]);
  expect(sections[0].resourceIds).toEqual(["material:shared"]);
  expect(sections[1].resourceIds).toEqual([]);
  expect(sections[1].sharedResources).toEqual([{ rowId: "material:shared", titleRu: "Общий материал",
    ownerOperationTitleRu: "Поставка материалов" }]);
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(panel(current as never)); });
  const strings = (value: unknown): string[] => typeof value === "string" ? [value]
    : Array.isArray(value) ? value.flatMap(strings)
      : value && typeof value === "object" && "children" in value ? strings(value.children) : [];
  const text = strings(renderer.toJSON());
  expect(text).toContain("Поставка материалов");
  expect(text).toContain("Укладка покрытия");
  expect(text.filter(value => value === "К закупке: 703 шт.")).toHaveLength(1);
  expect(text.filter(value => value === "2 KGS за шт.")).toHaveLength(1);
  expect(text).toContain("↳ Общий материал");
  expect(text.join(' ')).not.toContain('общий ресурс. Учтён');
  expect(text.join(" ")).not.toContain("Неприменимая подработка");
  expect(text.join(" ")).not.toContain("Чужой механизм");
  expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-row-material:shared" }).length).toBeGreaterThan(0);
  expect(JSON.stringify({ current, foreignItem })).toBe(before);
  act(() => renderer.unmount());
});

it("shows functional purchasing operation headings and shared owner titles without rewriting the source revision", () => {
  const current = revision(true) as unknown as EstimateDraftRevision;
  const owner = { contractVersion: "canonical-operation-resource/v1", groupId: "wall", operationId: "prime",
    groupTitleRu: "Грунтование оштукатуренных стен VGT 0301", operationTitleRu: "Загрунтовать VGT0301 перед шпаклёвкой и высушить",
    completionCriterionRu: "Исходная приёмка", additionalOperations: [{ operationId: "mix",
      operationTitleRu: "Затворение CT126 целыми последовательными замесами", completionCriterionRu: "Исходная приёмка" }] };
  current.boq.rows[0].sourceParameters = { canonicalOperationComposition: owner };
  const before = JSON.stringify(current);
  const rows = buildCanonicalProcurementPreviewRows(current), sections = buildCanonicalProcurementPreviewSections(current, rows);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ rowId: "material:anchor-group:anchor-bolts", quantity: 52, unitPrice: null,
    operation: { groupId: "wall", operationId: "prime", operationTitleRu: "Грунтование перед шпаклеванием" } });
  expect(sections.map(section => section.operation?.operationTitleRu)).toEqual(["Грунтование перед шпаклеванием", "Приготовление гипсовой шпаклёвки"]);
  expect(sections[1].sharedResources[0].ownerOperationTitleRu).toBe("Грунтование перед шпаклеванием");
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(panel(current as never)); });
  const visible = JSON.stringify(renderer.toJSON());
  expect(visible).toContain("Грунтование перед шпаклеванием");
  expect(visible).toContain("Приготовление гипсовой шпаклёвки");
  expect(visible).not.toMatch(/VGT0301|CT126/iu);
  expect(JSON.stringify(current)).toBe(before);
  act(() => renderer.unmount());
});

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
  expect(projected[0].titleRu).not.toContain("CONTROL_ONLY");
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
  expect(rendered).not.toContain("CONTROL_ONLY");
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
