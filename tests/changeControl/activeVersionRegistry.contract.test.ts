import { getActiveEstimateConfigVersion } from "../../src/lib/ai/changeControl";
import { publishValidTemplateChange } from "./changeControlTestHelpers";

describe("change control - active version registry", () => {
  it("tracks the currently active version per controlled entity", () => {
    const { store, change, active } = publishValidTemplateChange();
    expect(active.active_change_id).toBe(change.id);
    expect(getActiveEstimateConfigVersion(store, "GLOBAL_ESTIMATE_TEMPLATE", "roof_waterproofing")?.active_version).toBe(change.entity_version);
  });
});
