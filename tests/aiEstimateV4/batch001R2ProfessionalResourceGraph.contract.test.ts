import { allBatch001Rows } from "./batch001R2ContractSupport";
import { drywallCeilingBulkheadProfessionalOwnerIdV3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";

describe("BATCH001 R2 ProfessionalResourceGraphV3", () => {
  test("gives every row one typed boundary, owner and non-cost dependency policy", () => {
    const rows = allBatch001Rows();
    expect(new Set(rows.map(({ row }) => row.cost_owner_id)).size).toBe(rows.length);
    for (const { parts, row } of rows) {
      expect(row.resource_graph_node_v3?.graph_version).toBe("ProfessionalResourceGraphV3");
      expect(row.resource_graph_node_v3?.typed_child_boundary).toBe(parts.contract.group);
      expect(row.resource_graph_node_v3?.forbidden_cost_scopes).toEqual(parts.contract.forbidden_cost_scope);
      expect(row.semantic_owner).toBe(drywallCeilingBulkheadProfessionalOwnerIdV3(parts.contract.catalog_id));
      if (parts.contract.group !== "FRAME") {
        expect(row.resource_graph_node_v3?.non_cost_dependencies_only).toBe(true);
        expect(row.resource_graph_node_v3?.dependency_ids.length).toBeGreaterThan(0);
      }
    }
  });
});
