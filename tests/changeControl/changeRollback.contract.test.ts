import { getActiveEstimateConfigVersion, rollbackEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { publishValidTemplateChange } from "./changeControlTestHelpers";

describe("change control - rollback", () => {
  it("restores the previous active version", () => {
    const { store, change } = publishValidTemplateChange();
    expect(getActiveEstimateConfigVersion(store, "GLOBAL_ESTIMATE_TEMPLATE", "roof_waterproofing")?.active_change_id).toBe(change.id);
    const event = rollbackEstimateConfigChange(store, change.id, "approver", "test rollback");
    expect(event.rollback_to_change_id).toBe(change.previous_active_change_id);
    expect(getActiveEstimateConfigVersion(store, "GLOBAL_ESTIMATE_TEMPLATE", "roof_waterproofing")?.active_change_id).toBe(change.previous_active_change_id);
  });
});
