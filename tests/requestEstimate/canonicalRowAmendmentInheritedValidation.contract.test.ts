import { parameterIssuesBlockingConsumerCanonicalRecalculation } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import type { CanonicalParameterValidationIssue } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation";

describe("canonical row amendment with inherited validation issues", () => {
  const inheritedGeometryConflict: CanonicalParameterValidationIssue = {
    code: "GEOMETRY_CONFLICT",
    parameterId: "area_m2",
    relatedParameterId: "length_m,width_m",
  };

  it("does not block a row-only exclude or restore on a historical revision", () => {
    expect(parameterIssuesBlockingConsumerCanonicalRecalculation({
      issues: [inheritedGeometryConflict],
      parameterPatchCount: 0,
      rowOverrideCount: 1,
    })).toEqual([]);
  });

  it("continues to block parameter edits and no-op recalculations", () => {
    expect(parameterIssuesBlockingConsumerCanonicalRecalculation({
      issues: [inheritedGeometryConflict],
      parameterPatchCount: 1,
      rowOverrideCount: 1,
    })).toEqual([inheritedGeometryConflict]);
    expect(parameterIssuesBlockingConsumerCanonicalRecalculation({
      issues: [inheritedGeometryConflict],
      parameterPatchCount: 0,
      rowOverrideCount: 0,
    })).toEqual([inheritedGeometryConflict]);
  });
});
