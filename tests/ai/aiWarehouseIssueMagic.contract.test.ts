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
    expect(pack?.visibleDomainData).toEqual(expect.arrayContaining([
      "запрошенные позиции",
      "доступно полностью",
      "дефицит",
      "позиции, где нужен approval",
    ]));
    expect(pack?.safeActions).toEqual(expect.arrayContaining([
      "показать дефицит",
      "предложить альтернативу",
    ]));
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Черновик выдачи", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Показать дефицит", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Предложить альтернативу", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Отправить на approval", actionKind: "approval_required" }),
      expect.objectContaining({ label: "Списать или выдать напрямую", actionKind: "forbidden" }),
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
