import { publishEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { createEstimateConfigChange, validateEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { createSeededChangeControlStore, validTemplatePayload } from "./changeControlTestHelpers";

describe("change control - approval", () => {
  it("blocks publish without approval even after validation", () => {
    const store = createSeededChangeControlStore();
    const change = createEstimateConfigChange(store, {
      entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
      entity_id: "roof_waterproofing",
      new_payload: validTemplatePayload(),
      actor_id: "operator",
    });
    expect(validateEstimateConfigChange(store, change.id).status).toBe("passed");
    expect(() => publishEstimateConfigChange(store, change.id, "publisher")).toThrow("approval");
  });
});
