import {
  buildAiProcurementSuppliersMagicMatrix,
  listAiProcurementSuppliersMagicPacks,
} from "../../scripts/ai/aiProcurementSuppliersMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

describe("AI supplier magic screen", () => {
  it("turns supplier showcase into an evidence-safe buyer workbench", () => {
    const pack = listAiProcurementSuppliersMagicPacks()
      .find((item) => item.screenId === "supplier.showcase");

    expect(pack).toBeTruthy();
    expect(pack?.visibleDomainData).toEqual(expect.arrayContaining([
      "supplier reliability",
      "coverage",
      "risks",
      "missing data",
    ]));
    expect(pack?.safeActions).toEqual(expect.arrayContaining([
      "сравнить с внутренними",
      "показать cited варианты",
    ]));
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Сравнить с другим", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Подготовить запрос", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Добавить в shortlist", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Отправить выбор на approval", actionKind: "approval_required" }),
      expect.objectContaining({ label: "Подтвердить поставщика напрямую", actionKind: "forbidden" }),
    ]));
    expect(JSON.stringify(pack)).not.toMatch(/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake availability/i);
  });

  it("keeps supplier buttons visible without direct order, direct confirmation or warehouse mutation", () => {
    const pack = listAiProcurementSuppliersMagicPacks()
      .find((item) => item.screenId === "supplier.showcase");
    expect(pack).toBeTruthy();

    for (const button of pack?.buttons ?? []) {
      const result = buildAiScreenMagicButtonResultCopy({ pack: pack!, buttonIdOrLabel: button.id });
      expect(result).toMatchObject({
        providerCallAllowed: false,
        dbWriteUsed: false,
        directMutationUsed: false,
      });
      expect(button.canExecuteDirectly).toBe(false);
    }

    const matrix = buildAiProcurementSuppliersMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    expect(matrix.direct_order_paths_found).toBe(0);
    expect(matrix.warehouse_mutation_paths_found).toBe(0);
    expect(matrix.supplier_options_show_evidence_or_exact_no_evidence).toBe(true);
    expect(matrix.external_options_without_citation).toBe(0);
  });
});
