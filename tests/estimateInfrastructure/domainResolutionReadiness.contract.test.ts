import {
  resolveDomainResolutionReadiness,
} from "../../src/lib/estimate/estimateDraftRevisionContract";

describe("neutral domain resolution readiness", () => {
  it("does not equate resolution existence with scope or calculation readiness", () => {
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      scopeRequired: true,
      scopeResolved: false,
      requiredInputsPresent: true,
      normativeApplicabilityResolved: true,
      calculationStrategyAvailable: true,
    })).toBe("NEEDS_SCOPE_SELECTION");
  });

  it("fails closed for source gaps, reclassification and ambiguity", () => {
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      scopeResolved: true,
      normativeApplicabilityResolved: false,
      calculationStrategyAvailable: true,
    })).toBe("NORMATIVE_SOURCE_GAP");
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      reclassifiedToOtherDomain: true,
    })).toBe("RECLASSIFICATION_REQUIRED");
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      ambiguous: true,
    })).toBe("UNSUPPORTED_OR_AMBIGUOUS");
  });

  it("requires scope, inputs, sources and a calculation strategy for GREEN readiness", () => {
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      scopeRequired: true,
      scopeResolved: true,
      requiredInputsPresent: true,
      normativeApplicabilityResolved: true,
      calculationStrategyAvailable: true,
    })).toBe("CALCULATION_READY");
  });

  it("prioritizes an application prohibition over scope and missing inputs", () => {
    expect(resolveDomainResolutionReadiness({
      resolutionExists: true,
      applicationAllowed: false,
      scopeRequired: true,
      scopeResolved: false,
      requiredInputsPresent: false,
      normativeApplicabilityResolved: true,
      calculationStrategyAvailable: true,
    })).toBe("APPLICATION_NOT_ALLOWED");
  });
});
