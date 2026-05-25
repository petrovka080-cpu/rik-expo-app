import type { GlobalUnitInput } from "../globalEstimate/globalEstimateTypes";
import {
  intentForBuiltInAi10000PostBoqDomain,
  isBuiltInAi10000PostBoqProductDomain,
  sourcePolicyForBuiltInAi10000PostBoqDomain,
} from "./builtInAi10000PostBoqDomains";
import type {
  BuiltInAi10000PostBoqCase,
  BuiltInAi10000PostBoqDomain,
  BuiltInAi10000PostBoqExpectedTool,
  BuiltInAi10000PostBoqRouteCoverage,
} from "./builtInAi10000PostBoqCaseTypes";

export const BUILT_IN_AI_10000_POST_BOQ_CASES_PER_DOMAIN = 100;
export const BUILT_IN_AI_10000_POST_BOQ_CASES_TOTAL = 10000;

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

type CaseOverride = {
  promptRu: string;
  workKey?: string;
  volume?: number;
  unit?: GlobalUnitInput["normalizedUnit"];
  routeCoverage?: BuiltInAi10000PostBoqRouteCoverage[];
  expectedRowsContain?: string[];
};

function padId(value: number): string {
  return String(value).padStart(5, "0");
}

function unitLabel(unit: GlobalUnitInput["normalizedUnit"] | string): string {
  if (unit === "sq_m") return "sq_m";
  if (unit === "m3") return "m3";
  if (unit === "linear_m") return "linear_m";
  if (unit === "kg") return "kg";
  if (unit === "ton") return "ton";
  if (unit === "pcs") return "pcs";
  return "set";
}

function unitForDomain(domain: BuiltInAi10000PostBoqDomain): GlobalUnitInput["normalizedUnit"] {
  if (isBuiltInAi10000PostBoqProductDomain(domain)) return "pcs";
  if (domain.category === "documents_design" || domain.category === "delivery_equipment" || domain.category === "other") return "set";
  if (domain.workKey.includes("strip_foundation")) return "linear_m";
  if (domain.workKey.includes("rebar") || domain.category === "metalworks") return "kg";
  if (domain.category === "foundation" || domain.category === "concrete") return "m3";
  return "sq_m";
}

function volumeFor(domainIndex: number, packageIndex: number, unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "pcs") return 8 + packageIndex;
  if (unit === "kg") return 250 + domainIndex * 8 + packageIndex * 5;
  if (unit === "set") return 1;
  if (unit === "m3") return 8 + domainIndex + packageIndex;
  if (unit === "linear_m") return 25 + domainIndex + packageIndex;
  return 40 + domainIndex + packageIndex * 5;
}

function expectedToolFor(domain: BuiltInAi10000PostBoqDomain): BuiltInAi10000PostBoqExpectedTool {
  return isBuiltInAi10000PostBoqProductDomain(domain) ? "search_material_products" : "calculate_global_estimate";
}

function routeCoverageFor(domain: BuiltInAi10000PostBoqDomain): BuiltInAi10000PostBoqRouteCoverage[] {
  if (isBuiltInAi10000PostBoqProductDomain(domain)) return ["product_search", "chat"];
  return ["chat", "request", "ai_foreman", "pdf_viewer"];
}

function requiredRateKeysFor(domain: BuiltInAi10000PostBoqDomain, workKey: string): string[] {
  if (isBuiltInAi10000PostBoqProductDomain(domain)) return [`${workKey}_product_source`];
  if (workKey === "strip_foundation") {
    return [
      "strip_foundation_concrete_m300",
      "strip_foundation_longitudinal_rebar",
      "strip_foundation_formwork_material",
      "strip_foundation_concrete_pour",
    ];
  }
  return [`${workKey}_material`, `${workKey}_labor`];
}

function catalogPoliciesFor(domain: BuiltInAi10000PostBoqDomain): string[] {
  if (isBuiltInAi10000PostBoqProductDomain(domain)) {
    return [
      "source_status_explicit",
      "availability_unknown_unless_confirmed",
      "stock_unknown_unless_confirmed",
      "supplier_unknown_unless_confirmed",
    ];
  }
  return [
    "catalog_binding_attempted_for_material_rows",
    "catalog_item_id_required_when_catalog_candidate_selected",
    "source_fields_required_when_price_shown",
    "availability_unknown_unless_confirmed",
  ];
}

function boqDepthPolicyFor(domain: BuiltInAi10000PostBoqDomain, workKey: string): string {
  if (isBuiltInAi10000PostBoqProductDomain(domain)) return "product_search_source_governance";
  if (workKey === "strip_foundation" || domain.domainId.includes("turnkey") || domain.domainId === "full_project_boq") {
    return "post_boq_professional_depth_gte_12";
  }
  if (domain.dangerousWork) return "post_boq_professional_depth_gte_8_specialist_review";
  return "post_boq_professional_depth_gte_4";
}

function specialOverride(domain: BuiltInAi10000PostBoqDomain, sequenceInDomain: number): CaseOverride | null {
  if (sequenceInDomain !== 0 && sequenceInDomain !== 1) return null;
  if (domain.domainId === "foundations" && sequenceInDomain === 0) {
    return {
      promptRu: "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м",
      workKey: "strip_foundation",
      volume: 48,
      unit: "linear_m",
      routeCoverage: ["request", "chat", "ai_foreman", "pdf_viewer"],
    };
  }
  if (domain.domainId === "masonry" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for brick masonry 74 sq_m", workKey: "brick_masonry", volume: 74, unit: "sq_m" };
  }
  if (domain.domainId === "roofing_pitched" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for gable roof installation base 100 sq_m", workKey: "gable_roof_installation", volume: 100, unit: "sq_m" };
  }
  if (domain.domainId === "roadworks" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for asphalt paving 1000 sq_m", workKey: "asphalt_paving", volume: 1000, unit: "sq_m" };
  }
  if (domain.domainId === "flooring" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for carpet flooring installation 100 sq_m", workKey: "carpet_laying", volume: 100, unit: "sq_m" };
  }
  if (domain.domainId === "flooring" && sequenceInDomain === 1) {
    return { promptRu: "estimate cost for laminate laying 100 sq_m", workKey: "laminate_laying", volume: 100, unit: "sq_m" };
  }
  if (domain.domainId === "tile" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for ceramic tile floor laying 174 sq_m", workKey: "ceramic_tile_floor_laying", volume: 174, unit: "sq_m" };
  }
  if (domain.domainId === "drywall" && sequenceInDomain === 0) {
    return { promptRu: "estimate cost for drywall wall cladding gkl 352 sq_m", workKey: "drywall_wall_cladding", volume: 352, unit: "sq_m" };
  }
  if (domain.domainId === "procurement" && sequenceInDomain === 0) {
    return { promptRu: "find product material for rebar Ø14 12 pcs", workKey: "rebar_product_search", volume: 12, unit: "pcs", routeCoverage: ["product_search", "chat"] };
  }
  if (domain.domainId === "roadworks" && sequenceInDomain === 1) {
    return { promptRu: "find product material for asphalt concrete for 10000 sq_m", workKey: "asphalt_supplier_search", volume: 10000, unit: "sq_m", routeCoverage: ["product_search", "chat"] };
  }
  return null;
}

function defaultPrompt(input: {
  domain: BuiltInAi10000PostBoqDomain;
  scope: string;
  packageName: string;
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
}): string {
  if (input.domain.domainId === "foundations") {
    return `estimate cost for strip foundation length ${input.volume} linear_m width 0.4 m height 1.7 m ${input.scope} scenario ${input.packageName}`;
  }
  const prefix = isBuiltInAi10000PostBoqProductDomain(input.domain)
    ? "find product material for"
    : "estimate cost for";
  return `${prefix} ${input.domain.promptAnchor} ${input.scope} scenario ${input.packageName} ${input.volume} ${unitLabel(input.unit)}`;
}

function buildCase(
  domain: BuiltInAi10000PostBoqDomain,
  domainIndex: number,
  scopeIndex: number,
  packageIndex: number,
): BuiltInAi10000PostBoqCase {
  const sequenceInDomain = scopeIndex * PACKAGES.length + packageIndex;
  const id = padId(domainIndex * BUILT_IN_AI_10000_POST_BOQ_CASES_PER_DOMAIN + sequenceInDomain + 1);
  const unit = unitForDomain(domain);
  const volume = volumeFor(domainIndex, packageIndex, unit);
  const override = specialOverride(domain, sequenceInDomain);
  const workKey = override?.workKey ?? domain.workKey;
  const finalUnit = override?.unit ?? unit;
  const finalVolume = override?.volume ?? volume;
  const intent = override?.workKey?.includes("_search")
    ? "product_search"
    : intentForBuiltInAi10000PostBoqDomain(domain);
  const expectedTool = intent === "product_search" ? "search_material_products" : expectedToolFor(domain);
  const routeCoverage = override?.routeCoverage ?? routeCoverageFor(domain);
  const promptRu = override?.promptRu ?? defaultPrompt({
    domain,
    scope: SCOPES[scopeIndex],
    packageName: PACKAGES[packageIndex],
    volume: finalVolume,
    unit,
  });

  return {
    id,
    domainId: domain.domainId,
    category: domain.category,
    workFamily: domain.workFamily,
    workKey,
    promptRu,
    promptEn: promptRu,
    intent,
    expectedTool,
    volume: finalVolume,
    unit: finalUnit,
    templateId: intent === "estimate" ? `global_estimate_template:${workKey}` : undefined,
    requiredRateKeys: requiredRateKeysFor(domain, workKey),
    requiredCatalogPolicies: catalogPoliciesFor(domain),
    sourcePolicy: sourcePolicyForBuiltInAi10000PostBoqDomain(domain),
    boqDepthPolicyKey: boqDepthPolicyFor(domain, workKey),
    expectedRowsContain: override?.expectedRowsContain ?? domain.expectedRowsContain,
    forbiddenRowsContain: domain.forbiddenRowsContain ?? ["generic construction work row", "plain text markdown table"],
    routeCoverage,
    requiresPdfAction: intent === "estimate",
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: intent === "estimate",
    dangerousWork: domain.dangerousWork === true,
    noDiyInstructionsRequired: domain.dangerousWork === true,
    specialistReviewRequired: domain.dangerousWork === true || domain.sourcePolicy === "manual_review_allowed",
    productSearch: intent === "product_search"
      ? {
        expectedProductFamily: domain.productFamily ?? domain.promptAnchor,
        fakeStockForbidden: true,
        fakeSupplierForbidden: true,
        fakeAvailabilityForbidden: true,
      }
      : undefined,
  };
}

export function buildBuiltInAi10000PostBoqCases(
  domains: readonly BuiltInAi10000PostBoqDomain[],
): readonly BuiltInAi10000PostBoqCase[] {
  return Object.freeze(
    domains.flatMap((domain, domainIndex) =>
      SCOPES.flatMap((_, scopeIndex) =>
        PACKAGES.map((__, packageIndex) => buildCase(domain, domainIndex, scopeIndex, packageIndex)),
      ),
    ),
  );
}
