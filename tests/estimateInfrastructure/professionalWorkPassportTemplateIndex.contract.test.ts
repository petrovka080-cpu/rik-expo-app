import {
  buildProfessionalWorkPassport,
  getProfessionalWorkPassportRegistryFingerprint,
  getProfessionalWorkPassportTemplateIndexFingerprint,
  isProfessionalWorkPassportTemplateIndexCurrent,
  listProfessionalWorkPassportTemplateIds,
  listProfessionalWorkPassportTemplateIndex,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";

describe("professional work passport lightweight template index", () => {
  it("indexes all 11,610 identities without constructing their BOQ passports", () => {
    const ids = listProfessionalWorkPassportTemplateIds();
    const index = listProfessionalWorkPassportTemplateIndex();
    const repeatedIndex = listProfessionalWorkPassportTemplateIndex();
    const registryFingerprint = getProfessionalWorkPassportRegistryFingerprint();
    const indexFingerprint = getProfessionalWorkPassportTemplateIndexFingerprint();

    expect(ids).toHaveLength(11_610);
    expect(index).toHaveLength(11_610);
    expect(repeatedIndex).toBe(index);
    expect(new Set(index.map((entry) => entry.templateId)).size).toBe(11_610);
    expect(index.map((entry) => entry.templateId)).toEqual(ids);
    expect(index.every((entry) => entry.text.includes(entry.templateId))).toBe(true);
    expect(indexFingerprint).toBe(registryFingerprint);
    expect(isProfessionalWorkPassportTemplateIndexCurrent(indexFingerprint)).toBe(true);
    expect(isProfessionalWorkPassportTemplateIndexCurrent(`${indexFingerprint}-registry-drift`)).toBe(false);

    for (const entry of [index[0], index[9_999], index[10_000], index[11_609]]) {
      const passport = buildProfessionalWorkPassport(entry.templateId);
      expect(passport).not.toBeNull();
      expect(entry.text).toContain(passport!.templateId);
      expect(entry.text).toContain(passport!.familyId);
    }
  });
});
