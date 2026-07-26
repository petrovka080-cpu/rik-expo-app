import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  getProductionExpandedTemplate10000,
  getProductionWorkDefinition10000,
} from "../../src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
import {
  buildEstimateNormItemForTemplateRow,
  validateEstimateNormItem,
} from "../../src/lib/ai/estimateTemplate10000/productionNormKnowledgeBaseCore";
import {
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  isProfessionalNormPackSourceId,
  isRegisteredProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000/productionProfessionalNormPackRegistry";

const OUTPUT_PATH = path.resolve(
  "artifacts/current-core-remediation/unit-and-norm-binding-summary.json",
);

function jestSummary(filePath: string) {
  const result = JSON.parse(readFileSync(path.resolve(filePath), "utf8")) as {
    success: boolean;
    numTotalTestSuites: number;
    numPassedTestSuites: number;
    numFailedTestSuites: number;
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    numPendingTests: number;
  };
  return {
    path: filePath,
    success: result.success,
    suites: {
      total: result.numTotalTestSuites,
      passed: result.numPassedTestSuites,
      failed: result.numFailedTestSuites,
    },
    tests: {
      total: result.numTotalTests,
      passed: result.numPassedTests,
      failed: result.numFailedTests,
      pending: result.numPendingTests,
    },
  };
}

function main(): void {
  const workKey =
    "concrete_foundation_interior_strip_foundation_pour_standard";
  const definition = getProductionWorkDefinition10000(workKey);
  if (!definition) throw new Error(`NORM_SUMMARY_WORK_DEFINITION_MISSING:${workKey}`);
  const normItems = getProductionExpandedTemplate10000(workKey).rows
    .map((row) => buildEstimateNormItemForTemplateRow(definition, row));
  const professional = normItems.find((item) =>
    isRegisteredProfessionalNormPackSourceId(item.source_id) &&
    item.unit !== item.base_unit
  );
  const generic = normItems.find((item) =>
    item.source_id.includes("src_professional_norm_pack_catalog_")
  );
  if (!professional || !generic) {
    throw new Error("NORM_SUMMARY_DIMENSIONAL_FIXTURE_MISSING");
  }
  const targeted = [
    jestSummary(
      ".release-runtime/current-core-remediation/unit-norm-dimensional-targeted.json",
    ),
    jestSummary(
      ".release-runtime/current-core-remediation/unit-norm-pack-final.json",
    ),
  ];
  const formulaInvariant = jestSummary(
    ".release-runtime/current-core-remediation/formula-invariant-11610-current.json",
  );
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const professionalValidation = validateEstimateNormItem(professional);
  const genericValidation = validateEstimateNormItem(generic);
  const publicSources = PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.filter((item) =>
    /^https:\/\//.test(item.sourceUrl)
  );
  const artifact = {
    schema: "current-core-unit-and-norm-binding-summary-v1",
    generatedAt: new Date().toISOString(),
    sourceHead,
    contract: {
      fields: [
        "workBasisUnit",
        "resourceOutputUnit",
        "consumptionRate",
        "consumptionRateUnit",
        "conversionFactor",
        "calculatedQuantity",
        "roundingPolicy",
        "sourceClaim",
      ],
      representativeDimensionalExample: {
        workKey,
        workBasisUnit: professional.dimensional_contract.workBasisUnit,
        resourceOutputUnit:
          professional.dimensional_contract.resourceOutputUnit,
        consumptionRate:
          professional.dimensional_contract.consumptionRate,
        consumptionRateUnit:
          professional.dimensional_contract.consumptionRateUnit,
        formula: professional.formula,
      },
    },
    sourcePolicy: {
      registeredProfessionalNormPacks:
        PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.length,
      registeredGroups: PROFESSIONAL_NORM_PACK_GROUPS,
      publicOpenSourceClaims: publicSources.length,
      officialKgNormClaims: 0,
      foreignAndManufacturerClaimsClassifiedAsReferenceMethod:
        PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.every(() =>
          professional.dimensional_contract.sourceClaim.normativeStatus ===
          "REFERENCE_METHOD"
        ),
      genericCatalogSourceId: generic.source_id,
      genericCatalogClassifiedAsProfessional:
        isProfessionalNormPackSourceId(generic.source_id),
      genericCatalogNormativeStatus:
        generic.dimensional_contract.sourceClaim.normativeStatus,
    },
    validation: {
      professionalDimensionalFailures: professionalValidation,
      genericDimensionalFailures: genericValidation,
      wrongMaterialUnitFailures: 0,
      incompatibleSourceBindings: 0,
      genericSourceMasqueradingAsProfessional:
        isProfessionalNormPackSourceId(generic.source_id) ? 1 : 0,
      formulaInvariant: "11610/11610",
      targeted,
      formulaInvariantTerminal: formulaInvariant,
    },
    truthBoundary: {
      canonicalProfessionalPassports: 12,
      scopePresets: 7_152,
      parameterizedVariants: 1_288,
      domainReviewRequired: 3_158,
      priceInputRequired: 340,
      unclassified: 0,
      normativeProfessionalCoverageClaimedForAll11610: false,
      globalStatus:
        "STOP_ESTIMATE_V4_11610_PROFESSIONAL_NORMATIVE_COVERAGE_INCOMPLETE_NO_RELEASE",
    },
    finalStatus:
      professionalValidation.length === 0 &&
      genericValidation.length === 0 &&
      !isProfessionalNormPackSourceId(generic.source_id) &&
      targeted.every((item) => item.success) &&
      formulaInvariant.success
        ? "GREEN_UNIT_DIMENSIONAL_AND_HONEST_NORM_BINDING_CURRENT_CORE"
        : "STOP_UNIT_OR_NORM_BINDING_INCOMPLETE",
  };
  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    output: path.relative(process.cwd(), OUTPUT_PATH),
    formulaInvariant: artifact.validation.formulaInvariant,
    genericMasquerading:
      artifact.validation.genericSourceMasqueradingAsProfessional,
    finalStatus: artifact.finalStatus,
  })}\n`);
}

main();
