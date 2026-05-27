import { createEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { createSeededChangeControlStore, validCatalogPayload } from "./changeControlTestHelpers";

describe("change control - impact scope", () => {
  it("computes catalog binding impact scope across manual and automatic paths", () => {
    const store = createSeededChangeControlStore();
    const change = createEstimateConfigChange(store, {
      entity_type: "CATALOG_BINDING_POLICY",
      entity_id: "ai_material_rows",
      new_payload: validCatalogPayload(),
      actor_id: "operator",
    });
    expect(change.impact_scope.impacted_cases).toEqual(expect.arrayContaining([
      "manual_catalog_item_addition",
      "request_draft_with_manual_catalog_item",
      "pdf_payload_parity",
    ]));
    expect(change.impact_scope.impacted_routes).toEqual(expect.arrayContaining(["/request", "/ai?context=foreman"]));
  });
});
