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

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const generatedAt = new Date().toISOString();
const output = path.resolve("artifacts/multi-domain-professional-corpus");
const status = "STOP_ESTIMATE_V4_MULTI_DOMAIN_REFERENCE_COVERAGE_INCOMPLETE_NO_RELEASE";
const blockers = [
  "Twelve entries are source-identified candidates, not implemented ProfessionalEstimatePassportV4 objects.",
  "Independent golden scenarios are not implemented.",
  "Domain review, Web proof and Android API 34 proof are absent.",
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
    implementedProfessionalPassports: 0,
    independentGoldenScenarios: 0,
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
  independentScenariosReady: 0,
  productionGeneratedGolden: 0,
});

writeJson("cross-domain-nlp-summary.json", {
  implemented: false,
  requiredCases: [
    "залить фундамент != бетонная стяжка",
    "оштукатурить стену != кладка",
    "положить кабель != труба",
    "сделать крышу -> уточнить тип кровли",
    "провести отопление -> уточнить систему",
    "заасфальтировать двор -> дорожный паспорт",
  ],
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
  `Groups reviewed: 20/20\nReference candidates: 12\nImplemented passports: 0/12\nIndependent goldens: 0/60\n` +
  `Generated scope IDs claimed as professional works: 0\nClosed sources: 0\nNO_WEB_PRODUCT_PROOF\nNO_ANDROID_API34_PRODUCT_PROOF\nNO_RELEASE\n`);

console.info(JSON.stringify({ status, groups: 20, candidates: 12, passports: 0, independentGoldens: 0 }, null, 2));
