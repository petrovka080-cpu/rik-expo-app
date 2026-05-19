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
    expect(pack?.visibleDomainData.join(" ")).toMatch(/пришло позиций|расхождения с заявкой|не хватает документов|ручная проверка/i);
    expect(pack?.riskSummary.join(" ")).toMatch(/расхождение|документ|ручная проверка/i);
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ actionKind: "safe_read", canExecuteDirectly: false }),
      expect.objectContaining({ actionKind: "draft_only", canExecuteDirectly: false }),
      expect.objectContaining({ actionKind: "approval_required", canExecuteDirectly: false }),
      expect.objectContaining({ actionKind: "forbidden", canExecuteDirectly: false }),
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
