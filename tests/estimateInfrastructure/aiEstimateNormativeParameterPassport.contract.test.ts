import {
  buildAiEstimateNormativeWorkParameterPassport,
  clearAiEstimateNormativeWorkParameterPassportCache,
} from "../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport";
import { listProfessionalWorkPassportTemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassport";

jest.setTimeout(300_000);

function stableSample(ids: string[], count: number): string[] {
  const selected: string[] = [];
  const used = new Set<string>();
  for (let index = 0; selected.length < count && index < ids.length * 3; index += 1) {
    const id = ids[(index * 43 + 17) % ids.length];
    if (!used.has(id)) {
      used.add(id);
      selected.push(id);
    }
  }
  return selected;
}

describe("AI estimate normative parameter passports", () => {
  it("builds connected normative passports on a representative catalog sample", () => {
    const ids = listProfessionalWorkPassportTemplateIds();
    const sample = stableSample(ids, 250);

    expect(ids).toHaveLength(11610);
    for (const templateId of sample) {
      const passport = buildAiEstimateNormativeWorkParameterPassport(templateId);
      expect(passport).toBeTruthy();
      expect(passport?.requirements.length).toBeGreaterThan(0);
      expect(passport?.requiredForQuantity.length).toBeGreaterThan(0);
      expect(passport?.requirements.every((requirement) => requirement.affectsRowIds.length > 0)).toBe(true);
    }
    clearAiEstimateNormativeWorkParameterPassportCache();
  });
});
