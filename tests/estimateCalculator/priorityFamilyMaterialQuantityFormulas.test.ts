import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { materialQuantityLinesFromRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { validateProfessionalMaterialQuantityAccuracy } from "../../src/lib/estimate/validateProfessionalMaterialQuantityAccuracy";

function totalFor(prompt: string): { family: string; total: number; lines: number } {
  const revision = createEstimateDraftRevision({
    rawInput: prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  const lines = materialQuantityLinesFromRows({
    rows: revision.boq.rows,
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
  });
  const validation = validateProfessionalMaterialQuantityAccuracy({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    rows: revision.boq.rows,
  });
  expect(validation.passed).toBe(true);
  return {
    family: revision.matchedFamily,
    total: lines.reduce((sum, line) => sum + line.procurementQuantity, 0),
    lines: lines.length,
  };
}

describe("priority family material quantity formulas", () => {
  it.each([
    [
      "village_water_supply",
      "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
      "водоснабжение села 6 км труба ПНД 110 водонапорная башня 25 м3",
    ],
    [
      "road_construction",
      "строительство дороги 1 км ширина 6 м асфальт два слоя щебеночное основание",
      "строительство дороги 2 км ширина 6 м асфальт два слоя щебеночное основание",
    ],
    [
      "earth_dam",
      "строительство земляной дамбы 200 м высота 5 м геотекстиль габионы дренаж",
      "строительство земляной дамбы 260 м высота 5 м геотекстиль габионы дренаж",
    ],
    [
      "high_rise_glazing",
      "высотное остекление фасада 5000 м2 высота 60 м алюминий стеклопакет",
      "высотное остекление фасада 6200 м2 высота 60 м алюминий стеклопакет",
    ],
  ])("%s material procurement quantity is formula-sensitive", (family, lowPrompt, highPrompt) => {
    const low = totalFor(lowPrompt);
    const high = totalFor(highPrompt);

    expect(low.family).toBe(family);
    expect(high.family).toBe(family);
    expect(low.lines).toBeGreaterThan(0);
    expect(high.total).toBeGreaterThan(low.total);
  });
});
