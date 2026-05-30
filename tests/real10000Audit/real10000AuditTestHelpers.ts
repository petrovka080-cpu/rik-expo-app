import type { Real10000ConstructionWorkCase } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

export function auditCase(overrides: Partial<Real10000ConstructionWorkCase> = {}): Real10000ConstructionWorkCase {
  return {
    caseId: "audit_case_001",
    promptRu: "смета на проверочную строительную работу 100 кв м",
    route: "/request",
    macroDomain: "residential_construction",
    domain: "audit_domain",
    expectedResolvedDomain: "audit_domain",
    expectedObject: "audit_object",
    expectedOperation: "installation",
    workObjectVariant: "audit_domain_main_area_new_build",
    workOperationVariant: "installation_street_access",
    complexity: "medium",
    quantityExpectation: { areaM2: 100 },
    expectedMinimumRows: 18,
    requiredRowTokens: ["материал", "работа"],
    forbiddenRowTokens: ["прочее"],
    unitRules: ["м2"],
    pdfRequired: true,
    catalogBindingRequired: true,
    sourceEvidenceRequired: true,
    regulatedSafetyRequired: false,
    ...overrides,
  };
}

export function auditRuntimeResult(overrides: Record<string, unknown> = {}) {
  return {
    caseId: "audit_case_001",
    macroDomain: "residential_construction",
    domain: "audit_domain",
    complexity: "medium",
    rowCount: 20,
    unitSemanticsPassed: true,
    catalogBindingPassed: true,
    sourceEvidencePassed: true,
    taxWarningPassed: true,
    forbiddenRowsFound: [],
    requiredRowsMissing: [],
    regulatedSafetyPassed: true,
    runtimeTraceId: "trace_audit_001",
    failures: [],
    ...overrides,
  };
}
