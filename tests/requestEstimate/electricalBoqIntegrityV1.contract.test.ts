import {
  buildCanonicalElectricalConsumerRepairAiDraft,
} from "../../src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import {
  assertElectricalBoqIntegrityV1,
  inspectElectricalBoqIntegrityV1,
  type ElectricalBoqIntegrityRow,
} from "../../src/lib/estimate/v4/electrical/electricalBoqIntegrityV1";

const FULL_PROMPT =
  "электромонтаж под ключ, площадь 87 м², трасса 154 м, " +
  "10 розеток, 10 выключателей, 8 точек освещения";

describe("electrical BOQ duplicate and double-count protection", () => {
  it("keeps every compiled row under one unique semantic owner", () => {
    const draft = buildCanonicalElectricalConsumerRepairAiDraft({
      text: FULL_PROMPT,
    });
    const rows: ElectricalBoqIntegrityRow[] = draft.items.map((item) => ({
      rowCode: String(item.sourceParameters?.rowCode ?? ""),
      semanticOwner: String(item.sourceParameters?.semanticOwner ?? ""),
      titleRu: item.titleRu,
      resourceType: item.itemType,
      quantity: item.quantity,
      unit: item.unit,
    }));

    expect(() => assertElectricalBoqIntegrityV1(rows)).not.toThrow();
    expect(inspectElectricalBoqIntegrityV1(rows)).toEqual({
      duplicateRowCode: [],
      duplicateSemanticOwner: [],
      duplicateNormalizedName: [],
      aggregateDetailOverlap: [],
      materialDoubleCount: [],
      laborDoubleCount: [],
      resourceIdentityCollision: [],
    });
  });

  it("rejects the legacy cable aggregate/detail overlap and physical double count", () => {
    const legacyRows: ElectricalBoqIntegrityRow[] = [
      {
        rowCode: "cable",
        semanticOwner: "electrical:material:physical-cable",
        titleRu: "Кабель",
        resourceType: "material",
        quantity: 100,
        unit: "linear_m",
      },
      {
        rowCode: "cable_lines",
        semanticOwner: "electrical:material:physical-cable",
        titleRu: "Кабельные линии",
        resourceType: "material",
        quantity: 100,
        unit: "linear_m",
      },
      {
        rowCode: "power_cable",
        semanticOwner: "electrical:material:physical-cable",
        titleRu: "Кабель силовой",
        resourceType: "material",
        quantity: 100,
        unit: "linear_m",
      },
    ];
    const report = inspectElectricalBoqIntegrityV1(legacyRows);

    expect(report.duplicateSemanticOwner).toEqual([
      "electrical:material:physical-cable",
    ]);
    expect(report.materialDoubleCount).toEqual([
      "electrical:material:physical-cable",
    ]);
    expect(() => assertElectricalBoqIntegrityV1(legacyRows)).toThrow(
      /ELECTRICAL_BOQ_INTEGRITY_INVALID/,
    );
  });
});
