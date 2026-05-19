import {
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

describe("AI warehouse incoming magic", () => {
  it("shows discrepancies, missing documents and manual-check drafts without receiving stock", () => {
    const pack = listAiWarehouseLogisticsMagicPacks()
      .find((entry) => entry.screenId === "warehouse.incoming");

    expect(pack).toBeTruthy();
    expect(pack?.visibleDomainData).toEqual(expect.arrayContaining([
      "пришло позиций",
      "расхождения с заявкой",
      "missing documents",
      "ручная проверка",
    ]));
    expect(pack?.riskSummary.join(" ")).toMatch(/расхождение|документ|ручная проверка/i);
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Список расхождений", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Запросить документ", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Отправить спорные позиции на согласование", actionKind: "approval_required" }),
      expect.objectContaining({ label: "Подготовить черновик проверки", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Подтвердить приход AI", actionKind: "forbidden" }),
    ]));

    for (const button of pack?.buttons ?? []) {
      const result = buildAiScreenMagicButtonResultCopy({ pack: pack!, buttonIdOrLabel: button.id });
      expect(result?.dbWriteUsed).toBe(false);
      expect(result?.directMutationUsed).toBe(false);
      if (button.actionKind === "approval_required") expect(button.approvalRoute).toBeTruthy();
    }

    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    expect(matrix.warehouse_incoming_ready).toBe(true);
    expect(matrix.direct_receive_paths_found).toBe(0);
    expect(matrix.fake_incoming_created).toBe(false);
  });
});
