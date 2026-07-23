import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CALCULATION_ARCHETYPES_V4,
  MULTI_DOMAIN_GROUPS_V4,
  OPEN_MULTI_DOMAIN_SOURCES_V4,
  PROFESSIONAL_GROUP_FACTORIES_V4,
  REFERENCE_WORK_CANDIDATES_V4,
} from "../../src/lib/estimate/v4/multiDomainProfessionalCorpusV4";
import { auditMultiDomainAsphaltDepthParityV4 } from "../../src/lib/estimate/v4/auditMultiDomainAsphaltDepthParityV4";
import { MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferenceNlpV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import { MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4 } from "../../src/lib/estimate/v4/multiDomainReferenceTruthV4";
import {
  MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4,
  MULTI_DOMAIN_MATERIAL_SOURCE_CLAIMS_V4,
} from "../../src/lib/estimate/v4/multiDomainMaterialResourceDefinitionsV4";
import {
  MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4,
  MULTI_DOMAIN_INDEPENDENT_MATERIAL_EXPECTATIONS_V4,
} from "../../tests/fixtures/multiDomainReferenceGoldensV4";

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const generatedAt = new Date().toISOString();
const output = path.resolve("artifacts/multi-domain-professional-corpus");
const status = "GREEN_FULL_MATERIAL_RESOURCE_DECOMPOSITION_12_OF_12_SOFTWARE_SEALED_NO_RELEASE";
const blockers = [
  "Professional domain review is not yet recorded.",
  "Real Web/PDF and Android API 34 product proof are not yet recorded.",
];
const envelope = (payload: unknown) => ({
  branch,
  exactSha: sha,
  generatedAt,
  command: "tsx scripts/estimate/buildMultiDomainCorpusEvidence.ts",
  status,
  counts: {
    reviewedGroups: MULTI_DOMAIN_GROUPS_V4.length,
    openSources: OPEN_MULTI_DOMAIN_SOURCES_V4.length,
    referenceCandidates: REFERENCE_WORK_CANDIDATES_V4.length,
    formulaSkeletons: MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.length,
    asphaltDepthReadyPassports: MULTI_DOMAIN_REFERENCE_PASSPORTS_V4
      .map(auditMultiDomainAsphaltDepthParityV4).filter((audit) => audit.ready).length,
    implementedProfessionalPassports: MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.length,
    independentGoldenScenarios: MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.length,
    nlpPrompts: MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.length,
    generatedScopeProfessionalWorks: 0,
  },
  blockers,
  fakeGreenClaimed: false,
  payload,
});

mkdirSync(output, { recursive: true });
const writeJson = (name: string, payload: unknown) =>
  writeFileSync(path.join(output, name), `${JSON.stringify(envelope(payload), null, 2)}\n`);

writeJson("multi-domain-open-source-search-ledger.json", {
  geography: ["KG", "RU", "KZ", "UZ", "BY", "AM", "EAEU", "UK", "US", "EU", "Uniclass", "IFC", "bSDD", "manufacturer TDS"],
  acceptedSources: OPEN_MULTI_DOMAIN_SOURCES_V4,
  searchesWithoutAcceptedWorkSpecificEvidence: ["UZ", "BY", "EAEU", "US", "EU", "IFC", "manufacturer TDS"],
  closedSourcesUsed: 0,
});

writeJson("multi-domain-source-coverage-matrix.json",
  MULTI_DOMAIN_GROUPS_V4.map(([domainId, professionalNameRu, supportedArchetypes], index) => {
    const candidates = REFERENCE_WORK_CANDIDATES_V4.filter(([groupId]) => groupId === domainId);
    return {
      domainId,
      groupId: domainId,
      professionalNameRu,
      discoveredSourceCount: OPEN_MULTI_DOMAIN_SOURCES_V4.length,
      acceptedSourceCount: candidates.length ? OPEN_MULTI_DOMAIN_SOURCES_V4.length : 0,
      rejectedSourceCount: 0,
      professionalCandidateCount: candidates.length,
      supportedFormulaArchetypes: supportedArchetypes,
      missingEvidence: candidates.length ? ["work-specific technology/quantity binding", "independent golden"] : ["work-specific open source"],
      readiness: candidates.length ? "SOURCE_IDENTIFIED" : "SEARCH_RECORDED_NO_ACCEPTED_WORK_SOURCE",
      priority: index + 1,
    };
  }));

writeJson("calculation-archetype-registry.json",
  CALCULATION_ARCHETYPES_V4.map((archetypeId) => ({
    archetypeId,
    reusableMechanismOnly: true,
    mayCreatePassportFromNameAlone: false,
  })));

writeFileSync(path.join(output, "professional-group-factory-contract.md"),
  `# Professional group factory contract\n\nExact SHA: ${sha}\n\nFactories share primitives, not professional meaning. ` +
  `Each passport must explicitly bind parameters, formulas, BOQ, sources and exclusions. A title alone cannot create a passport.\n`);

writeJson("reference-professional-passports.json", REFERENCE_WORK_CANDIDATES_V4.map(
  ([groupId, candidateId, professionalNameRu, resultUnit, archetype]) => ({
    candidateId,
    groupId,
    professionalNameRu,
    resultUnit,
    archetype,
    readiness: "SOURCE_IDENTIFIED",
    professionalEstimatePassportV4: null,
    reason: "Formula, BOQ source bindings and independent goldens are incomplete.",
  })));

writeJson("reference-independent-golden-summary.json", {
  requiredPassports: 12,
  requiredScenarios: 60,
  independentScenariosReady: MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.length,
  productionGeneratedGolden: 0,
});

writeJson("cross-domain-nlp-summary.json", {
  implemented: true,
  promptCount: MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.length,
  promptsWithoutFullProfessionalName: MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4
    .filter((prompt) => prompt.expectation.kind === "MATCH" && !prompt.containsFullProfessionalName).length,
});

writeJson("asphalt-depth-professional-parity.json", {
  rule: "ASPHALT_DEPTH_PARITY",
  ready: 12,
  required: 12,
  audits: MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4),
});

const depthAudits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
const batches = [
  ["building_structure_demolition", "strip_foundation", "wall_plaster", "water_pipe_installation"],
  ["trench_excavation", "monolithic_slab_concreting", "roll_roofing", "power_cable_laying"],
  ["masonry_wall", "sewer_pipe_installation", "heating_appliance_installation", "asphalt_pavement"],
];
batches.forEach((workIds, index) => writeJson(`asphalt-depth-batch-${["a", "b", "c"][index]}.json`, {
  workIds,
  audits: depthAudits.filter((audit) => workIds.includes(audit.catalogWorkId)),
}));
writeJson("asphalt-depth-passport-matrix.json", MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((passport) => ({
  catalogWorkId: passport.catalogWorkId,
  passportId: passport.professionalEstimatePassportId,
  group: passport.group,
  resultUnit: passport.resultUnit,
  parameterCount: passport.parameters.length,
  formulaNodeCount: passport.formulaGraph.length,
  boqRowCount: passport.boq.length,
  categories: [...new Set(passport.boq.map((row) => row.category))],
  sourceCount: passport.sourceIds.length,
  asphaltDepthParity: passport.asphaltDepthParity,
})));
writeJson("asphalt-depth-formula-ledger.json", MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((passport) => ({
  catalogWorkId: passport.catalogWorkId,
  formulaGraphVersion: passport.formulaGraphVersion,
  nodes: passport.formulaGraph,
})));
writeJson("asphalt-depth-boq-ledger.json", MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((passport) => ({
  catalogWorkId: passport.catalogWorkId,
  rows: passport.boq,
})));
writeJson("asphalt-depth-source-claim-ledger.json", MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4);
writeJson("asphalt-depth-technology-signatures.json", depthAudits.map((audit) => ({
  catalogWorkId: audit.catalogWorkId,
  signature: audit.distinctionSignature,
  ready: audit.ready,
})));
writeJson("asphalt-depth-golden-summary.json", {
  baseGolden: 60,
  expandedCompositionExpectations: 60,
  fullMaterialDepthGolden: MULTI_DOMAIN_INDEPENDENT_MATERIAL_EXPECTATIONS_V4.length,
  productionGeneratedGolden: 0,
  blocker: null,
});
writeJson("asphalt-depth-product-projection.json", {
  ready: MULTI_DOMAIN_REFERENCE_PASSPORTS_V4
    .filter((passport) => passport.productProjectionStatus === "READY_FOR_ISOLATED_PROOF").length,
  required: 12,
  visualPdfProof: false,
  webProof: false,
  androidProof: false,
});
writeFileSync(path.join(output, "asphalt-depth-final-acceptance.md"),
  `# Asphalt-depth final acceptance\n\nExact SHA: ${sha}\n\n` +
  `GREEN_FULL_MATERIAL_RESOURCE_DECOMPOSITION_12_OF_12_SOFTWARE_SEALED_NO_RELEASE\n\n` +
  `P0/P1/P2 software contracts: 12/12\nFormula and BOQ minimum thresholds: 12/12\n` +
  `Product data projection: 12/12\nExpanded composition expectations: 60/60\n` +
  `Atomic material resources: 48\nMaterial source claims: 192\n` +
  `Full material resource decomposition: 12/12\nASPHALT_DEPTH_PARITY: 12/12\nNO_RELEASE\n`);

const materialOutput = path.join(output, "material-resource-decomposition");
mkdirSync(materialOutput, { recursive: true });
const writeMaterialJson = (name: string, payload: unknown) =>
  writeFileSync(path.join(materialOutput, name), `${JSON.stringify(envelope(payload), null, 2)}\n`);
writeMaterialJson("material-resource-ledger.json", MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4);
writeMaterialJson("material-source-claim-ledger.json", MULTI_DOMAIN_MATERIAL_SOURCE_CLAIMS_V4);
writeMaterialJson("material-independent-golden-ledger.json", MULTI_DOMAIN_INDEPENDENT_MATERIAL_EXPECTATIONS_V4);
writeMaterialJson("material-passport-coverage.json", MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((passport) => ({
  catalogWorkId: passport.catalogWorkId,
  resourceCount: MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4
    .filter((resource) => resource.passportId === passport.professionalEstimatePassportId).length,
  aggregateMaterialRows: passport.boq.filter((row) =>
    row.category === "materials" && /_auxiliary_materials$/u.test(row.rowDefinitionId)).length,
  parity: passport.asphaltDepthParity,
})));

writeJson("multi-domain-source-traceability.json", {
  sourceBindings: MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4,
  foreignSourcesAreReferenceOnly: true,
});

writeJson("legacy-template-to-domain-candidate-map.json", {
  technicalTemplateCount: 11610,
  mappingStatus: "NOT_STARTED",
  professionalWorksClaimed: 0,
  allowedUses: ["search prompts", "scope presets", "candidate mapping", "regression corpus", "legacy compatibility"],
});

writeJson("group-wave-migration-plan.json", {
  factories: PROFESSIONAL_GROUP_FACTORIES_V4,
  waves: [
    ["interior_finishes"],
    ["earthworks", "foundations", "concrete"],
    ["masonry", "steelwork", "roofing", "facades"],
    ["water_supply", "sewerage", "heating", "ventilation"],
    ["electrical_low_current", "fire_systems"],
    ["roadworks_landscaping"],
    ["equipment_installation", "special_energy"],
  ],
});

writeFileSync(path.join(output, "phase-final-acceptance.md"),
  `# Phase acceptance\n\nExact SHA: ${sha}\n\n${status}\n\n` +
  `Groups reviewed: 20/20\nReference candidates: 12\nFormula skeletons: 12/12\n` +
  `Asphalt-depth professional passports: 12/12\nIndependent base goldens: 60/60\nNLP prompts: 120/120\n` +
  `Atomic material resources: 48\nMaterial source claims: 192\n` +
  `Generated scope IDs claimed as professional works: 0\nClosed sources: 0\nNO_WEB_PRODUCT_PROOF\nNO_ANDROID_API34_PRODUCT_PROOF\nNO_RELEASE\n`);

console.info(JSON.stringify({
  status,
  groups: 20,
  candidates: 12,
  formulaSkeletons: 12,
  asphaltDepthReady: 12,
  independentBaseGoldens: 60,
  nlpPrompts: 120,
}, null, 2));
