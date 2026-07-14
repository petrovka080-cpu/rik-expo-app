import {
  CONSTRUCTION_DOMAIN_MAP,
  getConstructionMaterialSystem,
  type WorldConstructionPrimitive,
} from "../../src/lib/ai/worldConstructionOntology";
import { complexityForConstructionPrimitiveDomain } from "../../src/lib/ai/constructionPrimitives";
import {
  compileParametricBoqRecipe,
  validateParametricBoqRecipe,
} from "../../src/lib/ai/professionalBoq";
import {
  formatCatalogMaterialButtonLabel,
  visibleEstimateLabelViolations,
} from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import { UNIVERSAL_PROMPTS, dynamicBoq } from "../estimatorKernel/universalEstimatorTestHelpers";

function primitiveForDomain(definition: (typeof CONSTRUCTION_DOMAIN_MAP)[number]): WorldConstructionPrimitive {
  return {
    originalText: definition.domain,
    normalizedText: definition.domain,
    intentDetected: true,
    outcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE",
    domain: definition.domain,
    secondaryDomains: [],
    objectScope: definition.objects[0] ?? "site",
    operation: definition.operations[0] ?? "installation",
    method: definition.methods[0] ?? "generic_professional_method",
    materialSystem: getConstructionMaterialSystem(definition.materialSystems[0] ?? "general_building"),
    unit: definition.units[0] ?? "set",
    volume: 100,
    workKey: null,
    workFamily: definition.domain,
    titleRu: definition.labelRu,
    complexity: complexityForConstructionPrimitiveDomain(definition.domain),
    riskClass: definition.dangerousOrRegulated ? "regulated" : "normal",
    confidence: "medium",
    assumptions: [],
    exclusions: definition.exclusions,
    costIncreaseFactors: [],
    clarifyingQuestions: definition.clarifyingQuestions,
    disambiguationOptions: [],
    localWarnings: [],
  };
}

describe("multi-domain professional BOQ visible labels", () => {
  it("covers at least 50 domains without internal keys, generic rows, or visible warnings", () => {
    expect(CONSTRUCTION_DOMAIN_MAP).toHaveLength(50);

    const failures: string[] = [];
    for (const definition of CONSTRUCTION_DOMAIN_MAP) {
      const recipe = compileParametricBoqRecipe(primitiveForDomain(definition));
      const validation = validateParametricBoqRecipe(recipe);
      if (!validation.passed) failures.push(`${definition.domain}:${validation.failures.join("|")}`);

      const materialRows = recipe.rows.filter((row) => row.sectionType === "materials");
      expect(materialRows.length).toBeGreaterThan(0);
      expect(recipe.rows.some((row) => row.sectionType === "labor")).toBe(true);

      for (const row of recipe.rows) {
        const rowFailures = visibleEstimateLabelViolations(row.nameRu);
        if (rowFailures.length > 0) failures.push(`${definition.domain}:${row.code}:${rowFailures.join("|")}`);
      }

      for (const row of materialRows) {
        const label = formatCatalogMaterialButtonLabel({
          visibleName: row.nameRu,
          materialKey: row.materialKey,
        });
        const labelFailures = visibleEstimateLabelViolations(label);
        if (labelFailures.length > 0) failures.push(`${definition.domain}:${row.code}:catalog:${labelFailures.join("|")}`);
        expect(label).not.toContain(row.materialKey ?? row.code);
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps dynamic professional BOQ rows visible-safe for runtime estimator prompts", () => {
    const failures: string[] = [];
    for (const prompt of Object.values(UNIVERSAL_PROMPTS)) {
      const boq = dynamicBoq(prompt);
      for (const row of boq.rows) {
        const rowFailures = visibleEstimateLabelViolations(row.name);
        if (rowFailures.length > 0) failures.push(`${boq.plan.workKey}:${row.code}:${rowFailures.join("|")}`);
      }
    }

    expect(failures).toEqual([]);
  });
});

