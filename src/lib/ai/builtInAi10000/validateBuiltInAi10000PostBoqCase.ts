import type { BuiltInAi10000PostBoqCase } from "./builtInAi10000PostBoqCaseTypes";

export type BuiltInAi10000PostBoqCaseValidation = {
  id: string;
  valid: boolean;
  issues: string[];
};

function addIssue(issues: string[], condition: boolean, code: string): void {
  if (!condition) issues.push(code);
}

export function validateBuiltInAi10000PostBoqCase(
  testCase: BuiltInAi10000PostBoqCase,
): BuiltInAi10000PostBoqCaseValidation {
  const issues: string[] = [];
  addIssue(issues, testCase.id.length > 0, "CASE_ID_MISSING");
  addIssue(issues, testCase.domainId.length > 0, "DOMAIN_ID_MISSING");
  addIssue(issues, testCase.category.length > 0, "CATEGORY_MISSING");
  addIssue(issues, testCase.workFamily.length > 0, "WORK_FAMILY_MISSING");
  addIssue(issues, testCase.workKey.length > 0, "WORK_KEY_MISSING");
  addIssue(issues, testCase.promptRu.length > 0, "PROMPT_MISSING");
  addIssue(issues, testCase.expectedTool.length > 0, "EXPECTED_TOOL_MISSING");
  addIssue(issues, testCase.requiredCatalogPolicies.length > 0, "CATALOG_POLICY_MISSING");
  addIssue(issues, testCase.boqDepthPolicyKey.length > 0, "BOQ_DEPTH_POLICY_MISSING");
  addIssue(issues, testCase.expectedRowsContain.length > 0, "EXPECTED_ROWS_MISSING");
  addIssue(issues, testCase.routeCoverage.length > 0, "ROUTE_COVERAGE_MISSING");
  addIssue(issues, !testCase.productSearch || testCase.productSearch.fakeStockForbidden === true, "PRODUCT_STOCK_POLICY_MISSING");
  addIssue(issues, !testCase.productSearch || testCase.productSearch.fakeSupplierForbidden === true, "PRODUCT_SUPPLIER_POLICY_MISSING");
  addIssue(issues, !testCase.productSearch || testCase.productSearch.fakeAvailabilityForbidden === true, "PRODUCT_AVAILABILITY_POLICY_MISSING");
  if (testCase.intent === "estimate") {
    addIssue(issues, Boolean(testCase.templateId), "ESTIMATE_TEMPLATE_ID_MISSING");
    addIssue(issues, testCase.requiredRateKeys.length > 0, "ESTIMATE_RATE_KEYS_MISSING");
    addIssue(issues, testCase.requiresPdfAction, "ESTIMATE_PDF_POLICY_MISSING");
    addIssue(issues, testCase.requiresTaxStatusOrWarning, "ESTIMATE_TAX_POLICY_MISSING");
  }
  if (testCase.dangerousWork) {
    addIssue(issues, testCase.noDiyInstructionsRequired, "DANGEROUS_NO_DIY_POLICY_MISSING");
    addIssue(issues, testCase.specialistReviewRequired, "DANGEROUS_SPECIALIST_REVIEW_MISSING");
  }
  return {
    id: testCase.id,
    valid: issues.length === 0,
    issues,
  };
}
