import {
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

describe("AI map logistics magic", () => {
  it("uses logistics context for suppliers, route risks and linked requests without fake distance or ETA", () => {
    const pack = listAiWarehouseLogisticsMagicPacks()
      .find((entry) => entry.screenId === "map.main");

    expect(pack).toBeTruthy();
    expect(pack?.domain).toBe("logistics");
    expect(pack?.visibleDomainData).toEqual(expect.arrayContaining([
      "nearby suppliers",
      "nearby objects",
      "route risks",
      "delivery impact on requests",
    ]));
    expect(pack?.riskSummary).toEqual(expect.arrayContaining([
      "distance without evidence",
      "ETA without evidence",
      "supplier creation risk",
    ]));
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Сравнить поставщиков по логистике", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Показать риски маршрута", actionKind: "safe_read" }),
      expect.objectContaining({ label: "Подготовить запрос доставки", actionKind: "draft_only" }),
      expect.objectContaining({ label: "Открыть связанные заявки", actionKind: "safe_read" }),
    ]));

    for (const button of pack?.buttons ?? []) {
      const result = buildAiScreenMagicButtonResultCopy({ pack: pack!, buttonIdOrLabel: button.id });
      expect(result?.dbWriteUsed).toBe(false);
      expect(result?.directMutationUsed).toBe(false);
    }

    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    expect(matrix.map_logistics_ready).toBe(true);
    expect(matrix.fake_distance_created).toBe(false);
    expect(matrix.fake_eta_created).toBe(false);
    expect(matrix.fake_supplier_created).toBe(false);
  });
});
