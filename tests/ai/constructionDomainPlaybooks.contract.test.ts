import {
  CONSTRUCTION_DOMAIN_PLAYBOOKS,
  getConstructionDomainPlaybook,
} from "../../src/features/ai/constructionKnowhow/constructionDomainPlaybooks";

describe("Construction domain playbooks", () => {
  it("requires evidence, internal data sources, and risk rules for every domain", () => {
    for (const playbook of CONSTRUCTION_DOMAIN_PLAYBOOKS) {
      expect(playbook.evidenceRequired).toBe(true);
      expect(playbook.roleScopes.length).toBeGreaterThan(0);
      expect(playbook.safeReadUseCases.length).toBeGreaterThan(0);
      expect(playbook.draftUseCases.length).toBeGreaterThan(0);
      expect(playbook.approvalRequiredUseCases.length).toBeGreaterThan(0);
      expect(playbook.internalDataSources.length).toBeGreaterThan(0);
      expect(playbook.riskRules.length).toBeGreaterThan(0);
      expect(playbook.riskRules.every((rule) => rule.evidenceRequired === true)).toBe(true);
    }
  });

  it("keeps external intelligence preview-only for domains that allow it", () => {
    const procurement = getConstructionDomainPlaybook("procurement");
    const realEstate = getConstructionDomainPlaybook("real_estate_due_diligence");

    expect(procurement?.externalPreviewPolicy).toBe("citations_required_preview_only");
    expect(realEstate?.externalPreviewPolicy).toBe("citations_required_preview_only");
    expect(procurement?.forbiddenUseCases.join(" ")).toMatch(/confirm supplier|create order|invent supplier/);
  });
});
