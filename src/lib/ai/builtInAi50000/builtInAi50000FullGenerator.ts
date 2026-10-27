import type { GlobalUnitInput } from "../globalEstimate/globalEstimateTypes";
import type {
  BuiltInAi50000AnchorCase,
} from "./builtInAi50000CaseGenerator";
import { BUILT_IN_AI_50000_ANCHORS } from "./builtInAi50000CaseGenerator";
import type {
  BuiltInAi50000Case,
  BuiltInAi50000MacroDomain,
  BuiltInAi50000Phase1ExpectedTool,
  BuiltInAi50000Phase1Intent,
} from "./builtInAi50000CaseTypes";
import {
  BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN,
  BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN,
} from "./builtInAi50000Ontology";

const SCOPES = [
  "residential",
  "apartment",
  "private_house",
  "commercial",
  "industrial",
  "municipal",
  "utility",
  "emergency",
  "premium",
  "budget",
] as const;

const DOMAIN_VARIANTS = [
  "baseline",
  "renovation",
  "new_build",
  "repair",
  "maintenance",
  "fitout",
  "infrastructure",
  "warehouse",
  "school",
  "hospital",
  "retail",
  "office",
  "industrial_zone",
  "remote_site",
  "winter",
  "fast_track",
  "premium_finish",
  "budget_package",
  "audit_required",
  "emergency_response",
] as const;

const PACKAGES = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
] as const;

function pad(value: number, size: number): string {
  return String(value).padStart(size, "0");
}

function unitForDomain(domain: BuiltInAi50000MacroDomain): GlobalUnitInput["normalizedUnit"] {
  if (domain.category === "documents_design" || domain.category === "delivery_equipment") return "set";
  if (domain.category === "metalworks") return "kg";
  if (domain.defaultWorkKey.includes("pipe")) return "linear_m";
  return "sq_m";
}

function volumeFor(
  domain: BuiltInAi50000MacroDomain,
  domainIndex: number,
  caseIndex: number,
  unit: GlobalUnitInput["normalizedUnit"],
): number {
  if (unit === "set") return 1;
  if (unit === "pcs") return 10 + ((domainIndex * BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN + caseIndex) % 90);
  if (unit === "kg") return 250 + domain.ordinal * 10 + domainIndex * 15 + caseIndex;
  if (unit === "linear_m") return 20 + domainIndex * 2 + (caseIndex % 60);
  if (domain.defaultWorkKey === "asphalt_paving") return 100 + domainIndex * 25 + caseIndex * 5;
  return 40 + domain.ordinal + domainIndex * 3 + (caseIndex % 20) * 5;
}

function routeCoverageFor(intent: BuiltInAi50000Phase1Intent, requiresPdfAction: boolean) {
  if (intent === "product_search") return ["product_search"] as const;
  return requiresPdfAction
    ? (["chat", "ai_foreman", "request", "pdf_viewer"] as const)
    : (["chat", "ai_foreman", "request"] as const);
}

function sequenceFor(macroIndex: number, domainIndex: number, caseIndex: number): number {
  return (
    macroIndex *
      BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN *
      BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN +
    domainIndex * BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN +
    caseIndex +
    1
  );
}

function domainIdFor(domain: BuiltInAi50000MacroDomain, domainIndex: number): string {
  return `${domain.id}_domain_${pad(domainIndex + 1, 2)}`;
}

function buildFullSyntheticCase(
  domain: BuiltInAi50000MacroDomain,
  macroIndex: number,
  domainIndex: number,
  caseIndex: number,
): BuiltInAi50000Case {
  const sequence = sequenceFor(macroIndex, domainIndex, caseIndex);
  const productCase = caseIndex % 10 === 9;
  const scope = SCOPES[(domainIndex + caseIndex) % SCOPES.length];
  const packageName = PACKAGES[Math.floor(caseIndex / SCOPES.length) % PACKAGES.length];
  const domainVariant = DOMAIN_VARIANTS[domainIndex % DOMAIN_VARIANTS.length];
  const unit = productCase ? "pcs" : unitForDomain(domain);
  const volume = productCase ? 10 + domainIndex * 5 + caseIndex : volumeFor(domain, domainIndex, caseIndex, unit);
  const prompt = productCase
    ? `find product material supplier for ${domain.productFamily} ${domainVariant} phase2 domain ${pad(domainIndex + 1, 2)} variant ${pad(caseIndex + 1, 3)} ${scope} ${volume} ${unit}`
    : `estimate cost for ${domain.promptAnchor} ${domainVariant} phase2 domain ${pad(domainIndex + 1, 2)} variant ${pad(caseIndex + 1, 3)} ${scope} ${packageName} ${volume} ${unit}`;
  const intent: BuiltInAi50000Phase1Intent = productCase ? "product_search" : "estimate";
  const expectedTool: BuiltInAi50000Phase1ExpectedTool = productCase
    ? "search_material_products"
    : "calculate_global_estimate";
  return {
    id: `phase2_${pad(sequence, 5)}`,
    shardId: Math.floor((sequence - 1) / 1000),
    macroDomainId: domain.id,
    domainId: domainIdFor(domain, domainIndex),
    category: domain.category,
    workFamily: domain.workFamily,
    workKey: domain.defaultWorkKey,
    promptRu: prompt,
    promptEn: prompt,
    intent,
    expectedTool,
    volume,
    unit,
    templateId: productCase ? undefined : `${domain.defaultWorkKey}_template`,
    requiredRateKeys: productCase ? [domain.productFamily] : [domain.defaultWorkKey, domain.category],
    expectedRowsContain: domain.expectedRowsContain,
    forbiddenRowsContain: ["generic_construction_work_row", "plain_text_dump", "markdown_table"],
    routeCoverage: [...routeCoverageFor(intent, !productCase)],
    requiresPdfAction: !productCase,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: !productCase,
    dangerousWork: !productCase && domain.dangerousWork,
    noDiyInstructionsRequired: !productCase && domain.dangerousWork,
    specialistReviewRequired: !productCase && domain.dangerousWork,
    productSearch: productCase
      ? {
          expectedProductFamily: domain.productFamily,
          fakeStockForbidden: true,
          fakeSupplierForbidden: true,
          fakeAvailabilityForbidden: true,
        }
      : undefined,
    sourcePolicy: productCase ? "fresh_required" : "stale_allowed_with_warning",
  };
}

function buildFullAnchorCase(
  domain: BuiltInAi50000MacroDomain,
  anchor: BuiltInAi50000AnchorCase,
  macroIndex: number,
  domainIndex: number,
  caseIndex: number,
): BuiltInAi50000Case {
  const sequence = sequenceFor(macroIndex, domainIndex, caseIndex);
  const intent = anchor.intent ?? "estimate";
  const expectedTool = anchor.expectedTool ?? "calculate_global_estimate";
  const productCase = intent === "product_search";
  return {
    id: anchor.id,
    shardId: Math.floor((sequence - 1) / 1000),
    macroDomainId: domain.id,
    domainId: domainIdFor(domain, domainIndex),
    category: anchor.category ?? domain.category,
    workFamily: anchor.workFamily ?? domain.workFamily,
    workKey: anchor.workKey,
    promptRu: anchor.prompt,
    promptEn: anchor.prompt,
    intent,
    expectedTool,
    volume: anchor.volume,
    unit: anchor.unit,
    templateId: productCase ? undefined : `${anchor.workKey}_template`,
    requiredRateKeys: productCase
      ? [anchor.productFamily ?? domain.productFamily]
      : [anchor.workKey, anchor.category ?? domain.category],
    expectedRowsContain: domain.expectedRowsContain,
    forbiddenRowsContain: ["generic_construction_work_row", "plain_text_dump", "markdown_table"],
    routeCoverage: [...routeCoverageFor(intent, !productCase)],
    requiresPdfAction: !productCase,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: !productCase,
    dangerousWork: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    noDiyInstructionsRequired: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    specialistReviewRequired: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    productSearch: productCase
      ? {
          expectedProductFamily: anchor.productFamily ?? domain.productFamily,
          fakeStockForbidden: true,
          fakeSupplierForbidden: true,
          fakeAvailabilityForbidden: true,
        }
      : undefined,
    sourcePolicy: productCase ? "fresh_required" : "stale_allowed_with_warning",
  };
}

export function buildBuiltInAi50000FullCases(
  domains: readonly BuiltInAi50000MacroDomain[],
): readonly BuiltInAi50000Case[] {
  return Object.freeze(domains.flatMap((domain, macroIndex) => {
    const anchors = BUILT_IN_AI_50000_ANCHORS.filter((anchor) => anchor.macroDomainId === domain.id);
    const cases: BuiltInAi50000Case[] = [];
    for (let domainIndex = 0; domainIndex < BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN; domainIndex += 1) {
      for (let caseIndex = 0; caseIndex < BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN; caseIndex += 1) {
        const anchor = domainIndex === 0 ? anchors[caseIndex] : undefined;
        cases.push(anchor
          ? buildFullAnchorCase(domain, anchor, macroIndex, domainIndex, caseIndex)
          : buildFullSyntheticCase(domain, macroIndex, domainIndex, caseIndex));
      }
    }
    return cases;
  }));
}
