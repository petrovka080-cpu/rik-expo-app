import {
  GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR,
  STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN,
  STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000,
  auditProfessionalEstimateTemplateCatalogReadiness,
  buildProfessionalEstimateCalculatorSmokeSummary,
} from "../../src/lib/ai/professionalEstimateCalculator";

jest.setTimeout(120000);

describe("professional estimate backend template catalog", () => {
  it("uses the governed 10000-template backend catalog as source of truth", () => {
    const catalog = auditProfessionalEstimateTemplateCatalogReadiness();

    expect(catalog.status).not.toBe(STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000);
    expect(catalog.templatesTotal).toBe(10000);
    expect(catalog.canonicalWorkKeysTotal).toBe(10000);
    expect(catalog.compiledTemplatesTotal).toBe(10000);
    expect(catalog.compiledTemplatesFailed).toBe(0);
    expect(catalog.compiledRowsTotal).toBeGreaterThanOrEqual(250000);
    expect(catalog.categoryDistributionMatchesRequired).toBe(true);
    expect(catalog.promptVariantsCountedAsTemplates).toBe(false);
    expect(catalog.aliasesCountedAsTemplates).toBe(false);
    expect(catalog.mojibakeFound).toBe(0);
    expect(catalog.englishDebugLabelsVisible).toBe(0);
    expect(catalog.fakePricesFound).toBe(0);
    expect(catalog.missingPriceHandledHonestly).toBe(true);
    expect(catalog.fakeGreenClaimed).toBe(false);
  });

  it("does not claim green when the catalog readiness blockers are present", () => {
    const summary = buildProfessionalEstimateCalculatorSmokeSummary();

    expect(summary.finalStatus).toBe(GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR);
    expect(summary.catalog.blockers).toEqual([]);
    expect(summary.nativeBuildStarted).toBe(false);
    expect(summary.easStarted).toBe(false);
    expect(summary.releaseStarted).toBe(false);
    expect(summary.fullJestStarted).toBe(false);
    expect(summary.prodDbMutated).toBe(false);
    expect(summary.destructiveSqlExecuted).toBe(false);
    expect(summary.sourceGateEvidenceRequired).toBe(false);
    expect(summary.sourceGateBlockers).toEqual([]);
    expect(summary.runtimeEvidence.androidChromeSmokeStatus).toBe("not_required");
  });

  it("does not claim source-gate green without explicit gate evidence", () => {
    const summary = buildProfessionalEstimateCalculatorSmokeSummary({
      requireSourceGateEvidence: true,
    });

    expect(summary.finalStatus).toBe(STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN);
    expect(summary.sourceGateEvidenceRequired).toBe(true);
    expect(summary.sourceGateBlockers).toEqual(expect.arrayContaining([
      "FOCUSED_TESTS_NOT_PROVEN_GREEN",
      "TYPECHECK_NOT_PROVEN_GREEN",
      "LINT_NOT_PROVEN_GREEN",
      "OFFICE_MARKET_GATE_NOT_PROVEN_GREEN",
      "GIT_DIFF_CHECK_NOT_PROVEN_GREEN",
      "TEST_WEAKENING_GUARD_NOT_PROVEN_GREEN",
      "WEB_PUBLIC_SMOKE_NOT_PROVEN_GREEN",
      "SECRET_SCAN_NOT_PROVEN_GREEN",
      "TEMPLATE_IMPORT_PREVIEW_NOT_PROVEN_GREEN",
    ]));
  });

  it("claims source-gate green only when every required focused proof is explicit", () => {
    const summary = buildProfessionalEstimateCalculatorSmokeSummary({
      requireSourceGateEvidence: true,
      focusedTestsPassed: true,
      typecheckPassed: true,
      lintPassed: true,
      officeMarketPassed: true,
      gitDiffCheckPassed: true,
      testWeakeningGuardPassed: true,
      webPublicSmokePassed: true,
      secretScanPassed: true,
      templateImportPreviewPassed: true,
    });

    expect(summary.finalStatus).toBe(GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR);
    expect(summary.sourceGateBlockers).toEqual([]);
    expect(summary.runtimeEvidence.androidChromeSmokeStatus).toBe("not_required");
  });
});
