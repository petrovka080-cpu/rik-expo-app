import {
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

describe("AI warehouse issue magic", () => {
  it("shows issue drafts, shortage and alternatives without direct issue or write-off", () => {
    const pack = listAiWarehouseLogisticsMagicPacks()
      .find((entry) => entry.screenId === "warehouse.issue");

    expect(pack).toBeTruthy();
    expect(pack?.visibleDomainData.join(" ")).toMatch(/запрошенные позиции|доступно полностью|дефицит|согласование/i);
    expect(pack?.safeActions.join(" ")).toMatch(/дефицит|альтернатив/i);
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
      expect(button.canExecuteDirectly).toBe(false);
    }

    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    expect(matrix.warehouse_issue_ready).toBe(true);
    expect(matrix.direct_issue_paths_found).toBe(0);
    expect(matrix.direct_writeoff_paths_found).toBe(0);
    expect(matrix.fake_stock_created).toBe(false);
  });
});
