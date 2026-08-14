import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildConsumerRepairCanonicalSessionPreview } from "../../src/features/consumerRepair/consumerRepairCanonicalSessionPreview";
import type { CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";

function canonicalSession(): CanonicalParameterSession {
  return {
    coreSchemaVersion: "canonical-parameter-core:2026-07-28.v1",
    sessionId: "session:large-electrical-draft",
    draftId: "draft:large-electrical-draft",
    revisionId: "revision:4",
    schemaId: "electrical:substation:parameters:v2",
    schemaVersion: "2",
    workPassportId: "electrical:substation:passport:v2",
    canonicalWorkKey: "distribution_substation_as_built_estimate_expanded_complex_v1",
    calculationVersion: "2",
    status: "BLOCKING_REQUIRED",
    parameters: [
      {
        parameterId: "rated_voltage_v",
        label: "Rated voltage",
        description: "Circuit rated voltage",
        value: null,
        valueType: "number",
        unit: "V",
        requiredLevel: "BLOCKING_REQUIRED",
        visibilityCondition: { kind: "ALWAYS" },
        validation: { min: 230, max: 110_000, integer: true },
        allowedValues: [],
        source: "MISSING",
        state: "BLOCKING_REQUIRED",
        confidence: 0,
        assumption: null,
        affectsRows: ["electrical:row:voltage"],
        affectsFormula: ["electrical:formula:voltage"],
        normativeSource: null,
        displayOrder: 1,
        sourceText: null,
        valid: true,
        validationIssues: [],
      },
      {
        parameterId: "optional_note",
        label: "Optional note",
        description: "Optional project note",
        value: null,
        valueType: "string",
        unit: null,
        requiredLevel: "OPTIONAL",
        visibilityCondition: { kind: "ALWAYS" },
        validation: { nonEmpty: true },
        allowedValues: [],
        source: "MISSING",
        state: "NOT_APPLICABLE",
        confidence: 0,
        assumption: null,
        affectsRows: [],
        affectsFormula: [],
        normativeSource: null,
        displayOrder: 2,
        sourceText: null,
        valid: true,
        validationIssues: [],
      },
    ],
    blockingMissingParameterIds: ["rated_voltage_v"],
    contractMissingParameterIds: [],
    assumptionParameterIds: [],
    invalidParameterIds: [],
    fingerprint: "canonical-session-fingerprint",
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
  };
}

describe("consumer repair canonical session preview", () => {
  it("does not resolve the global domain schema registry from the restored-draft UI", () => {
    const source = readFileSync(join(
      process.cwd(),
      "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
    ), "utf8");

    expect(source).not.toContain("REGISTERED_CANONICAL_PARAMETER_SCHEMAS");
    expect(source).not.toContain("createCanonicalParameterSession");
  });

  it("returns the durable session unchanged before the user edits a value", () => {
    const session = canonicalSession();
    expect(buildConsumerRepairCanonicalSessionPreview({
      session,
      draftValues: { rated_voltage_v: "", optional_note: "" },
    })).toBe(session);
  });

  it("previews a valid edit without constructing the 605-work Electrical factory", () => {
    const preview = buildConsumerRepairCanonicalSessionPreview({
      session: canonicalSession(),
      draftValues: { rated_voltage_v: "10000", optional_note: "" },
    });

    expect(preview?.status).toBe("COMPLETE");
    expect(preview?.blockingMissingParameterIds).toEqual([]);
    expect(preview?.parameters[0]).toMatchObject({
      value: 10_000,
      source: "USER_EXPLICIT",
      state: "PROVIDED",
      valid: true,
    });
    expect(preview?.parameters[1].state).toBe("NOT_APPLICABLE");
  });

  it("keeps local validation visible while canonical persistence remains service-owned", () => {
    const preview = buildConsumerRepairCanonicalSessionPreview({
      session: canonicalSession(),
      draftValues: { rated_voltage_v: "220000", optional_note: "" },
    });

    expect(preview?.status).toBe("INVALID");
    expect(preview?.invalidParameterIds).toEqual(["rated_voltage_v"]);
    expect(preview?.parameters[0].validationIssues).toContain("NUMBER_ABOVE_MAX");
  });
});
