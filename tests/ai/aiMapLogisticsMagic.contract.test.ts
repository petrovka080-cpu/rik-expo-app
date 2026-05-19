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
    expect(pack?.visibleDomainData.join(" ")).toMatch(/поставщики|объекты|маршрут|доставка|заявки/i);
    expect(pack?.riskSummary.join(" ")).toMatch(/расстояние|срок доставки|поставщик|основание/i);
    expect(pack?.buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ actionKind: "safe_read", canExecuteDirectly: false }),
      expect.objectContaining({ actionKind: "draft_only", canExecuteDirectly: false }),
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
