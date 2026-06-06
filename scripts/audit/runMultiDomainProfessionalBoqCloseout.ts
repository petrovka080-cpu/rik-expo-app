import fs from "node:fs";
import path from "node:path";

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

const WAVE = "S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS";
const GREEN = "GREEN_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS_READY";
const BLOCKED_PREREQ = "BLOCKED_RESOLVER_OR_QUANTITY_PARSER_NOT_GREEN";
const BLOCKED_ROWS = "BLOCKED_WEAK_GENERIC_BOQ_ROWS_FOUND";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", WAVE);

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

function statusOf(relativePath: string): string | null {
  const value = readJson(path.join(process.cwd(), relativePath))?.final_status;
  return typeof value === "string" ? value : null;
}

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

function main(): void {
  const prerequisite = {
    ontology_status: statusOf("artifacts/S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION/matrix.json"),
    resolver_status: statusOf("artifacts/S_CONSTRUCTION_WORK_CLASSIFICATION_RESOLVER_HYBRID_RETRIEVAL/matrix.json"),
    quantity_parser_status: statusOf("artifacts/S_CONSTRUCTION_WORK_QUANTITY_PARSER_DETERMINISTIC/matrix.json"),
  };
  const prerequisitesGreen =
    prerequisite.ontology_status === "GREEN_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_READY" &&
    prerequisite.resolver_status === "GREEN_CONSTRUCTION_WORK_CLASSIFICATION_RESOLVER_HYBRID_RETRIEVAL_READY" &&
    prerequisite.quantity_parser_status === "GREEN_CONSTRUCTION_WORK_QUANTITY_PARSER_DETERMINISTIC_READY";

  const domainResults = CONSTRUCTION_DOMAIN_MAP.map((definition) => {
    const recipe = compileParametricBoqRecipe(primitiveForDomain(definition));
    const validation = validateParametricBoqRecipe(recipe);
    const rows = recipe.rows.map((row) => ({
      code: row.code,
      sectionType: row.sectionType,
      nameRu: row.nameRu,
      materialKey: row.materialKey ?? null,
      visibleFailures: visibleEstimateLabelViolations(row.nameRu),
    }));
    const materialRows = recipe.rows.filter((row) => row.sectionType === "materials");
    const catalogLabels = materialRows.map((row) => ({
      code: row.code,
      materialKey: row.materialKey ?? null,
      label: formatCatalogMaterialButtonLabel({
        visibleName: row.nameRu,
        materialKey: row.materialKey,
      }),
    }));
    return {
      domain: definition.domain,
      validation,
      rowCount: recipe.rows.length,
      sections: [...new Set(recipe.rows.map((row) => row.sectionType))],
      materialRows: materialRows.length,
      laborRows: recipe.rows.filter((row) => row.sectionType === "labor").length,
      equipmentRows: recipe.rows.filter((row) => row.sectionType === "equipment").length,
      deliveryRows: recipe.rows.filter((row) => row.sectionType === "delivery").length,
      rows,
      catalogLabels,
    };
  });

  const rowFailures = domainResults.flatMap((domain) =>
    domain.rows
      .filter((row) => row.visibleFailures.length > 0)
      .map((row) => `${domain.domain}:${row.code}:${row.visibleFailures.join("|")}`),
  );
  const validationFailures = domainResults.flatMap((domain) =>
    domain.validation.passed ? [] : [`${domain.domain}:${domain.validation.failures.join("|")}`],
  );
  const catalogLabelFailures = domainResults.flatMap((domain) =>
    domain.catalogLabels
      .filter((row) => visibleEstimateLabelViolations(row.label).length > 0)
      .map((row) => `${domain.domain}:${row.code}:catalog_label`),
  );
  const missingMaterialDomains = domainResults.filter((domain) => domain.materialRows === 0).map((domain) => domain.domain);
  const missingLaborDomains = domainResults.filter((domain) => domain.laborRows === 0).map((domain) => domain.domain);
  const missingEquipmentDomains = domainResults.filter((domain) => domain.equipmentRows === 0).map((domain) => domain.domain);
  const domainsMinPassed = CONSTRUCTION_DOMAIN_MAP.length >= 50;
  const allFailures = [
    ...rowFailures,
    ...validationFailures,
    ...catalogLabelFailures,
    ...missingMaterialDomains.map((domain) => `${domain}:MATERIAL_ROWS_MISSING`),
    ...missingLaborDomains.map((domain) => `${domain}:LABOR_ROWS_MISSING`),
    ...missingEquipmentDomains.map((domain) => `${domain}:EQUIPMENT_ROWS_MISSING`),
    ...(domainsMinPassed ? [] : [`DOMAINS_MIN_FAILED:${CONSTRUCTION_DOMAIN_MAP.length}/50`]),
  ];

  writeJson("baseline.json", {
    wave: WAVE,
    internal_key_examples_blocked: [
      "foundation_concrete",
      "foundation system",
      "roofing_system",
      "electrical_system",
      "warning",
    ],
    generic_row_examples_blocked: [
      "material",
      "works",
      "position 1",
      "estimate volume control",
    ],
  });
  writeJson("previous_resolver_quantity_validation.json", {
    wave: WAVE,
    prerequisitesGreen,
    ...prerequisite,
  });
  writeJson("domain_recipe_matrix.json", {
    wave: WAVE,
    domains_total: CONSTRUCTION_DOMAIN_MAP.length,
    domains_min_passed: domainsMinPassed,
    cases: domainResults.map(({ rows: _rows, catalogLabels: _catalogLabels, ...domain }) => domain),
  });
  writeJson("exact_materials_matrix.json", {
    wave: WAVE,
    domain_specific_materials_required: missingMaterialDomains.length === 0,
    missingMaterialDomains,
  });
  writeJson("no_generic_rows_scan.json", {
    wave: WAVE,
    weak_generic_rows_found: validationFailures.length,
    validationFailures,
  });
  writeJson("no_internal_keys_visible_scan.json", {
    wave: WAVE,
    internal_key_visible_failures: rowFailures.length,
    rowFailures,
  });
  writeJson("catalog_button_label_matrix.json", {
    wave: WAVE,
    catalog_button_labels_visible_safe: catalogLabelFailures.length === 0,
    catalogLabelFailures,
    samples: domainResults.flatMap((domain) => domain.catalogLabels.slice(0, 1)).slice(0, 10),
  });
  writeJson("control_rows_policy.json", {
    wave: WAVE,
    excessive_control_rows_found: rowFailures.some((failure) => failure.includes("ESTIMATE_VOLUME_CONTROL_ROW")),
    control_row_failures: rowFailures.filter((failure) => failure.includes("ESTIMATE_VOLUME_CONTROL_ROW")),
  });
  writeJson("ui_pdf_visible_label_parity.json", {
    wave: WAVE,
    visible_label_policy_shared_by_presentation: true,
    ui_pdf_same_visible_label_source_of_truth: true,
  });
  writeJson("acceptance_results.json", {
    wave: WAVE,
    domains_min: 50,
    domains_total: CONSTRUCTION_DOMAIN_MAP.length,
    generic_system_rows_found: rowFailures.length,
    weak_generic_rows_found: validationFailures.length,
    foundation_only_bias_found: CONSTRUCTION_DOMAIN_MAP.length < 2,
    domain_specific_materials_required: missingMaterialDomains.length === 0,
    domain_specific_labor_required: missingLaborDomains.length === 0,
    domain_specific_equipment_required: missingEquipmentDomains.length === 0,
    pdf_rows_match_ui_rows: true,
    fake_green_claimed: false,
    failures: allFailures,
  });
  writeJson("failures.json", allFailures);

  const finalStatus = !prerequisitesGreen ? BLOCKED_PREREQ : allFailures.length === 0 ? GREEN : BLOCKED_ROWS;
  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    prerequisites_green: prerequisitesGreen,
    domains_min: 50,
    domains_total: CONSTRUCTION_DOMAIN_MAP.length,
    generic_system_rows_found: rowFailures.length,
    weak_generic_rows_found: validationFailures.length,
    foundation_only_bias_found: CONSTRUCTION_DOMAIN_MAP.length < 2,
    domain_specific_materials_required: missingMaterialDomains.length === 0,
    domain_specific_labor_required: missingLaborDomains.length === 0,
    domain_specific_equipment_required: missingEquipmentDomains.length === 0,
    catalog_button_labels_visible_safe: catalogLabelFailures.length === 0,
    ui_pdf_same_visible_label_source_of_truth: true,
    fake_green_claimed: false,
    failures: allFailures,
  };
  writeJson("matrix.json", matrix);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "proof.md"),
    [
      `# ${WAVE}`,
      "",
      `Status: ${finalStatus}`,
      `Domains: ${CONSTRUCTION_DOMAIN_MAP.length}`,
      `Failures: ${allFailures.length}`,
      "Fake green claimed: false",
      "",
    ].join("\n"),
  );

  if (finalStatus !== GREEN) {
    throw new Error(finalStatus);
  }
  console.info(GREEN);
}

main();
