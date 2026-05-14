import {
  CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT,
  listConstructionKnowhowDomains,
  listConstructionKnowhowRoleIds,
  validateConstructionKnowhowRegistry,
} from "../../src/features/ai/constructionKnowhow/constructionKnowhowRegistry";

describe("Construction know-how registry", () => {
  it("registers every required construction domain and role with safety defaults", () => {
    expect(listConstructionKnowhowDomains().map((domain) => domain.domainId)).toEqual([
      "project_planning",
      "bim_information_management",
      "procurement",
      "supplier_selection",
      "warehouse_material_flow",
      "field_execution",
      "quality_control",
      "document_control",
      "finance_cost_control",
      "accounting",
      "contractor_management",
      "real_estate_due_diligence",
      "approval_workflow",
    ]);
    expect(listConstructionKnowhowRoleIds()).toEqual([
      "director_control",
      "buyer",
      "warehouse",
      "accountant",
      "foreman",
      "contractor",
    ]);

    expect(validateConstructionKnowhowRegistry().ok).toBe(true);
    expect(CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT.mutationCount).toBe(0);
    expect(CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT.dbWrites).toBe(0);
    expect(CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT.directExecution).toBe(false);
    expect(CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT.fakeEvidence).toBe(false);
  });
});
