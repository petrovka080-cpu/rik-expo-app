import { AI_DOMAIN_ENTITY_REGISTRY } from "../../src/features/ai/domainGraph/aiDomainEntityRegistry";
import { AI_DOMAIN_RELATIONSHIP_REGISTRY } from "../../src/features/ai/domainGraph/aiDomainRelationshipRegistry";
import { resolveAiDomainGraphEntity } from "../../src/features/ai/domainGraph/aiDomainGraphResolver";

describe("AI domain entity graph", () => {
  it("registers construction, procurement, warehouse, finance, subcontract, and real estate entities", () => {
    const entities = AI_DOMAIN_ENTITY_REGISTRY.map((entry) => entry.entity);

    expect(entities).toEqual(
      expect.arrayContaining([
        "project",
        "request",
        "supplier",
        "material",
        "warehouse_item",
        "stock_movement",
        "payment",
        "company_debt",
        "accounting_posting",
        "report",
        "pdf_document",
        "act",
        "subcontract",
        "contractor",
        "chat_thread",
        "real_estate_object",
        "land_plot",
        "commercial_space",
        "map_object",
        "office_member",
      ]),
    );
    expect(AI_DOMAIN_ENTITY_REGISTRY.every((entry) => entry.evidenceRequired)).toBe(true);
    expect(AI_DOMAIN_ENTITY_REGISTRY.every((entry) => entry.rawRowsAllowed === false)).toBe(true);
  });

  it("registers the required business relationships", () => {
    const relationshipKeys = AI_DOMAIN_RELATIONSHIP_REGISTRY.map(
      (entry) => `${entry.from}->${entry.to}`,
    );

    expect(relationshipKeys).toEqual(
      expect.arrayContaining([
        "project->request",
        "request->material",
        "request->supplier",
        "material->warehouse_item",
        "warehouse_item->stock_movement",
        "project->report",
        "project->act",
        "project->subcontract",
        "subcontract->contractor",
        "supplier->payment",
        "supplier->company_debt",
        "real_estate_object->project_estimate",
      ]),
    );
  });

  it("enforces role scoped entity visibility", () => {
    expect(resolveAiDomainGraphEntity({ role: "accountant", entity: "company_debt" })).toMatchObject({
      allowed: true,
      roleScoped: true,
      rawRowsAllowed: false,
    });
    expect(resolveAiDomainGraphEntity({ role: "warehouse", entity: "company_debt" })).toMatchObject({
      allowed: false,
      roleScoped: true,
      rawRowsAllowed: false,
    });
  });
});
