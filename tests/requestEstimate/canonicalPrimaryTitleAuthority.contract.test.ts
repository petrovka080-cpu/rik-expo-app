import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { foundationDraftWithManualCatalogItem } from "./requestEstimateBoqCatalogTestHelpers";

describe("canonical primary title authority", () => {
  it('retains shared-resource references in the ordinary request view without duplicating items or cost', () => {
    const source = foundationDraftWithManualCatalogItem();
    const baseline = buildRequestEstimateViewModel(source);
    const item = source.items[0]!;
    item.sourceParameters = { ...item.sourceParameters, canonicalOperationComposition: {
      contractVersion: 'canonical-operation-resource/v1', groupId: 'pipe', groupTitleRu: 'Монтаж трубы',
      operationId: 'straight', operationTitleRu: 'Прямые стыки', completionCriterionRu: 'Сварены',
      additionalOperations: [{ operationId: 'nodes', operationTitleRu: 'Фитинги узлов', completionCriterionRu: 'Сварены' }],
    } };
    const snapshot = JSON.stringify(source);
    const result = buildRequestEstimateViewModel(source);
    const group = result?.workProcessGroups?.find(value => value.groupId === 'pipe');
    expect(group?.operations.map(step => step.operationId)).toEqual(['straight', 'nodes']);
    expect(group?.operations[0]?.sharedResources?.map(resource => resource.rowId)).toEqual([item.id]);
    expect(result?.totalLabel).toBe(baseline?.totalLabel);
    expect(result?.rawItemCount).toBe(baseline?.rawItemCount);
    expect(JSON.stringify(source)).toBe(snapshot);
  });
  it("projects the known legacy PVC field name while preserving the persisted revision title and input", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    source.draft.problemText = "LOGICROOF 100 m2";
    const legacyTitle = "Поле ПВХ-кровли1.2мм по готовому утеплителю и бетонному основанию: крепление и сварка — 101 м²";
    source.structuredEstimatePayload.workTitle = legacyTitle;
    expect(buildRequestEstimateViewModel(source)?.title)
      .toBe("Укладка и крепление ПВХ-мембраны толщиной 1,2 мм — 101 м²");
    expect(source.structuredEstimatePayload.workTitle).toBe(legacyTitle);
    expect(source.draft.problemText).toBe("LOGICROOF 100 m2");
  });
  it("does not let a stale catalog-selection title override the compiled revision title", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    const bundle = {
      ...source,
      draft: {
        ...source.draft,
        selectedWorkTitleRu: "Кровельные работы — 100 м²",
      },
      structuredEstimatePayload: {
        ...source.structuredEstimatePayload,
        workTitle: "Кровельные работы — 200 м²",
      },
    };

    const viewModel = buildRequestEstimateViewModel(bundle);

    expect(viewModel?.title).toBe("Кровельные работы — 200 м²");
    expect(viewModel?.summary).toContain("Кровельные работы — 200 м²");
  });

  it("localizes a legacy raw piece code in a persisted canonical title", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    const bundle = {
      ...source,
      structuredEstimatePayload: {
        ...source.structuredEstimatePayload,
        workTitle: "Монтаж закладных — 28 piece",
      },
    };

    const viewModel = buildRequestEstimateViewModel(bundle);

    expect(viewModel?.title).toBe("Монтаж закладных — 28 шт.");
    expect(viewModel?.summary).not.toMatch(/\bpiece\b/u);
  });
});
