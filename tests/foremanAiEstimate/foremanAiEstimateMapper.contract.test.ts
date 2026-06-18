import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
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

describe("foreman AI professional estimate mapper", () => {
  it("keeps AI rows in foreman draft while sending only procurement rows to buyer", () => {
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

    const mapping = mapAiEstimateToForemanDraft({ estimate, context });
    const parity = verifyForemanAiEstimatePayloadParity(mapping);
    const buyerRows = mapApprovedForemanDraftToBuyerRows(mapping.rows);

    expect(parity.ok).toBe(true);
    expect(mapping.payload.rows.length).toBeGreaterThan(20);
    expect(mapping.rows).toHaveLength(mapping.payload.rows.length);
    expect(mapping.requestDraftLines.length).toBeGreaterThan(buyerRows.length);
    expect(mapping.rows.some((row) => row.section === "labor")).toBe(true);
    expect(buyerRows.length).toBeGreaterThan(0);
    expect(buyerRows.every((row) => row.kind === "material")).toBe(true);
    expect(buyerRows.some((row) => row.name_human.toLowerCase().includes("labor"))).toBe(false);
    expect(mapping.fakeGreenClaimed).toBe(false);
  });
});
