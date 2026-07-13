import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  addForemanAiEstimateCatalogMaterial,
  applyForemanAiEstimateDraftEdits,
  mapAiEstimateToForemanDraft,
  mapApprovedForemanDraftToBuyerRows,
  verifyForemanAiEstimatePayloadParity,
} from "../../src/lib/foremanAiEstimate";

const context = {
  objectName: "Administrative building",
  levelName: "1",
  systemName: "All",
  zoneName: "Room 101",
  sourceScreen: "foreman_materials" as const,
};

const buildMapping = () => {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442\u0430 154 \u043c2",
    explicitWorkKey: "laminate_laying",
    volume: 154,
    unit: "sq_m",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
    estimateDetailLevel: "professional_expanded",
  });
  return mapAiEstimateToForemanDraft({ estimate, context });
};

describe("foreman AI estimate editing and catalog rows", () => {
  it("recomputes edited quantity and price before draft submission", () => {
    const mapping = buildMapping();
    const target = mapping.rows.find((row) => row.section === "materials");
    expect(target).toBeTruthy();

    const edited = applyForemanAiEstimateDraftEdits(mapping, [
      {
        rowId: target!.rowId,
        visibleName: "Edited laminate",
        quantity: 10,
        unitPrice: 50,
      },
    ]);
    const editedRow = edited.rows.find((row) => row.rowId === target!.rowId)!;
    const draftLine = edited.requestDraftLines.find((row) => row.rik_code === editedRow.rik_code)!;

    expect(editedRow.visibleName).toBe("Edited laminate");
    expect(editedRow.quantity).toBe(10);
    expect(editedRow.unitPrice).toBe(50);
    expect(editedRow.total).toBe(500);
    expect(draftLine.qty).toBe(10);
    expect(draftLine.meta.name_human).toBe("Edited laminate");
    expect(draftLine.meta.note).toBe(
      "Объект: Administrative building; Этаж / уровень: 1; Система / раздел: All; Зона: Room 101",
    );
    expect(draftLine.meta.note).not.toContain('"source"');
  });

  it("adds catalog material as editable procurement-safe row", () => {
    const mapping = buildMapping();
    const withCatalog = addForemanAiEstimateCatalogMaterial(mapping, {
      rik_code: "CAT-FOAM-001",
      name_human: "\u041f\u0435\u043d\u0430 \u043c\u043e\u043d\u0442\u0430\u0436\u043d\u0430\u044f",
      uom_code: "pcs",
      kind: "material",
    }, {
      quantity: 2,
      unitPrice: 300,
    });

    const row = withCatalog.rows.find((item) => item.rik_code === "CAT-FOAM-001")!;
    const buyerRows = mapApprovedForemanDraftToBuyerRows(withCatalog.rows);
    const parity = verifyForemanAiEstimatePayloadParity(withCatalog);

    expect(row.section).toBe("materials");
    expect(row.requestDraftKind).toBe("material");
    expect(row.total).toBe(600);
    expect(parity.ok).toBe(true);
    expect(parity.issues).toEqual([]);
    expect(withCatalog.requestDraftLines.some((line) => line.rik_code === "CAT-FOAM-001")).toBe(true);
    expect(buyerRows.some((line) => line.rik_code === "CAT-FOAM-001")).toBe(true);
    expect(buyerRows.find((line) => line.rik_code === "CAT-FOAM-001")?.note).toBe(
      "Объект: Administrative building; Этаж / уровень: 1; Система / раздел: All; Зона: Room 101",
    );
  });
});
