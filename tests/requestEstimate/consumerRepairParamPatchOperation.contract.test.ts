import {
  isConsumerRepairParameterExplicitlyDirty,
  resolveConsumerRepairParamPatchOperation,
} from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import type { CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";

function canonicalSession(parameter: {
  parameterId: string;
  value: number | string | boolean | null;
  state: "PROVIDED" | "BLOCKING_REQUIRED";
}): CanonicalParameterSession {
  return {
    parameters: [parameter],
  } as unknown as CanonicalParameterSession;
}

describe("consumer repair parameter patch operation", () => {
  it("treats a user-confirmed missing enum default as dirty against persisted state", () => {
    expect(isConsumerRepairParameterExplicitlyDirty({
      baselineValue: "PARKING",
      draftValue: "PARKING",
      explicitlyConfirmedMissingValue: true,
    })).toBe(true);
    expect(isConsumerRepairParameterExplicitlyDirty({
      baselineValue: "PARKING",
      draftValue: "PARKING",
      explicitlyConfirmedMissingValue: false,
    })).toBe(false);
  });

  it("updates canonical parameters after a legacy revision-state handoff", () => {
    expect(resolveConsumerRepairParamPatchOperation({
      paramKey: "area_m2",
      revision: null,
      canonicalParameterSession: canonicalSession({
        parameterId: "area_m2",
        value: 900,
        state: "PROVIDED",
      }),
    })).toBe("update_param");
  });

  it("treats zero as an existing revision value", () => {
    expect(resolveConsumerRepairParamPatchOperation({
      paramKey: "curb_length_m",
      revision: { params: { curb_length_m: 0 } } as unknown as EstimateDraftRevision,
      canonicalParameterSession: null,
    })).toBe("update_param");
  });

  it("adds only an actually missing canonical parameter", () => {
    expect(resolveConsumerRepairParamPatchOperation({
      paramKey: "area_m2",
      revision: null,
      canonicalParameterSession: canonicalSession({
        parameterId: "area_m2",
        value: null,
        state: "BLOCKING_REQUIRED",
      }),
    })).toBe("add_param");
  });
});
