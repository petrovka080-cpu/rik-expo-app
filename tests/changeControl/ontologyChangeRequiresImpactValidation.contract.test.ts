import { createEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { createSeededChangeControlStore, validatePayload } from "./changeControlTestHelpers";

describe("change control - ontology impact validation", () => {
  it("computes impacted waterproofing cases", () => {
    const store = createSeededChangeControlStore();
    const change = createEstimateConfigChange(store, {
      entity_type: "WORK_KEY_MAPPING",
      entity_id: "roof_waterproofing_mapping",
      new_payload: { knownWork: true, workKey: "roof_waterproofing", domain: "roofing", object: "roof" },
      actor_id: "operator",
    });
    expect(change.impact_scope.impacted_cases).toEqual(expect.arrayContaining([
      "roof_waterproofing_100sqm",
      "bathroom_waterproofing_20sqm",
      "ambiguous_waterproofing_100sqm",
    ]));
  });

  it("rejects known work mapping to generic construction", () => {
    const { run } = validatePayload("WORK_KEY_MAPPING", "roof_waterproofing_mapping", {
      knownWork: true,
      workKey: "other_construction_work",
      domain: "roofing",
      object: "roof",
    });
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("KNOWN_WORK_GENERIC_MAPPING");
  });
});
