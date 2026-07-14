import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { auditPublicReferenceEstimateOwnership } from "../../src/lib/estimate/publicReferenceEstimateOwnership";

jest.setTimeout(240_000);

describe("public reference estimate ownership for 11610 work passports", () => {
  it("binds every work to a family-specific governed reference owner", () => {
    const templateIds = listProfessionalWorkPassportTemplateIds();
    const ownerIds = new Set<string>();
    const familyIds = new Set<string>();
    const baseOwnerIds = new Set<string>();
    let ready = 0;
    let missing = 0;
    const blockers: string[] = [];

    for (const [index, templateId] of templateIds.entries()) {
      const passport = buildProfessionalWorkPassport(templateId);
      expect(passport).toBeTruthy();
      if (!passport) continue;
      const audit = auditPublicReferenceEstimateOwnership(passport);
      if (audit.ready && audit.ownership) {
        ready += 1;
        ownerIds.add(audit.ownership.reference_owner_id);
        familyIds.add(audit.ownership.reference_family_id);
        if (passport.templateKind === "base_10000") baseOwnerIds.add(audit.ownership.reference_owner_id);
        expect(audit.ownership.work_id).toBe(templateId);
        expect(audit.ownership.source_registry_ids.length).toBeGreaterThan(0);
        expect(audit.ownership.source_url).toMatch(/^https?:\/\//);
        expect(audit.ownership.applicability_rule).toContain(passport.familyId);
        expect(audit.ownership.covered_scope).toContain("BOQ rows");
        expect(audit.ownership.excluded_scope).toContain("Final contractual quantities");
        expect(audit.ownership.work_specific_override).toContain(templateId);
      } else {
        missing += 1;
        blockers.push(`${templateId}:${audit.blockers.join("|")}`);
      }
      if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    }
    clearProfessionalWorkPassportBuildCaches();

    expect(templateIds).toHaveLength(11610);
    expect(ready).toBe(11610);
    expect(missing).toBe(0);
    expect(blockers).toEqual([]);
    expect(ownerIds.size).toBeGreaterThan(28);
    expect(familyIds.size).toBeGreaterThan(28);
    expect(baseOwnerIds.size).toBe(28);
    expect(ownerIds).not.toContain("reference_owner:all_10000:v1");
  });
});
