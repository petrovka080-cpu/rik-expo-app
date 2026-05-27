import { approveEstimateConfigChange, publishEstimateConfigChange } from "../../src/lib/ai/changeControl";
import { createSeededChangeControlStore, validatePayload, validTemplatePayload } from "./changeControlTestHelpers";
import { createEstimateConfigChange } from "../../src/lib/ai/changeControl";

describe("change control - template validation", () => {
  it("blocks template publish until validation has passed", () => {
    const store = createSeededChangeControlStore();
    const change = createEstimateConfigChange(store, {
      entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
      entity_id: "roof_waterproofing",
      new_payload: validTemplatePayload(),
      actor_id: "operator",
    });

    expect(() => approveEstimateConfigChange(store, change.id, "approver", "too early")).toThrow("validated");
    expect(() => publishEstimateConfigChange(store, change.id, "publisher")).toThrow("validation");
  });

  it("rejects shallow or unsafe template payloads", () => {
    const { run } = validatePayload("GLOBAL_ESTIMATE_TEMPLATE", "roof_waterproofing", validTemplatePayload({
      meaningfulRows: 3,
      rows: ["Строительные работы"],
      usesUnsafeFormula: true,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "BOQ_RECIPE_BELOW_DEPTH_POLICY",
      "GENERIC_BOQ_ROWS_FOUND",
      "TEMPLATE_UNSAFE_FORMULA",
    ]));
  });
});
