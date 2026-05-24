import type { BuiltInAi50000Case } from "./builtInAi50000CaseTypes";
import { BUILT_IN_AI_50000_FULL_CASES } from "./builtInAi50000FullManifest";
import {
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS,
  BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL,
} from "./builtInAi50000Ontology";

export type BuiltInAi50000Phase3Route =
  | "/chat"
  | "/ai?context=foreman"
  | "/request"
  | "/product/search"
  | "/pdf-viewer";

export type BuiltInAi50000Phase3SampleKind =
  | "web_domain"
  | "android_domain"
  | "request_draft"
  | "product_search"
  | "pdf_viewer"
  | "dangerous_safety";

export type BuiltInAi50000Phase3SampleItem = {
  caseId: string;
  domainId: string;
  macroDomainId: string;
  route: BuiltInAi50000Phase3Route;
  kind: BuiltInAi50000Phase3SampleKind;
  prompt: string;
  intent: BuiltInAi50000Case["intent"];
  expectedTool: BuiltInAi50000Case["expectedTool"];
  workKey: string;
  workFamily: string;
  dangerousWork: boolean;
};

export type BuiltInAi50000Phase3CriticalAnchor = {
  route: BuiltInAi50000Phase3Route;
  requestedPrompt: string;
  matchedCaseId: string;
  evidence: "manifest_anchor" | "domain_product_case" | "pdf_follow_up_case";
};

export type BuiltInAi50000Phase3LiveSamplePlan = {
  webCases: BuiltInAi50000Phase3SampleItem[];
  androidCases: BuiltInAi50000Phase3SampleItem[];
  requestDraftCases: BuiltInAi50000Phase3SampleItem[];
  productSearchCases: BuiltInAi50000Phase3SampleItem[];
  pdfViewerCases: BuiltInAi50000Phase3SampleItem[];
  dangerousCases: BuiltInAi50000Phase3SampleItem[];
  criticalAnchors: BuiltInAi50000Phase3CriticalAnchor[];
};

function uniqueById<T extends { caseId: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.caseId)) return false;
    seen.add(item.caseId);
    return true;
  });
}

function toItem(
  testCase: BuiltInAi50000Case,
  route: BuiltInAi50000Phase3Route,
  kind: BuiltInAi50000Phase3SampleKind,
  prompt = testCase.promptRu,
): BuiltInAi50000Phase3SampleItem {
  return {
    caseId: testCase.id,
    domainId: testCase.domainId,
    macroDomainId: testCase.macroDomainId,
    route,
    kind,
    prompt,
    intent: testCase.intent,
    expectedTool: testCase.expectedTool,
    workKey: testCase.workKey,
    workFamily: testCase.workFamily,
    dangerousWork: testCase.dangerousWork,
  };
}

function caseById(id: string): BuiltInAi50000Case {
  const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.id === id);
  if (!testCase) throw new Error(`Missing built-in AI 50000 case: ${id}`);
  return testCase;
}

function casesForDomain(domainId: string): readonly BuiltInAi50000Case[] {
  return BUILT_IN_AI_50000_FULL_CASES.filter((testCase) => testCase.domainId === domainId);
}

function firstEstimateForDomain(domainId: string): BuiltInAi50000Case {
  const testCase = casesForDomain(domainId).find((item) => item.intent === "estimate");
  if (!testCase) throw new Error(`Missing estimate case for domain: ${domainId}`);
  return testCase;
}

function firstProductForDomain(domainId: string): BuiltInAi50000Case {
  const testCase = casesForDomain(domainId).find((item) => item.intent === "product_search");
  if (!testCase) throw new Error(`Missing product case for domain: ${domainId}`);
  return testCase;
}

function fullDomainIds(): string[] {
  return [...new Set(BUILT_IN_AI_50000_FULL_CASES.map((testCase) => testCase.domainId))];
}

function firstCasesByMacro(limitPerMacro: number, route: BuiltInAi50000Phase3Route, kind: BuiltInAi50000Phase3SampleKind) {
  return BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId) =>
    BUILT_IN_AI_50000_FULL_CASES
      .filter((testCase) => testCase.macroDomainId === macroDomainId && testCase.intent === "estimate")
      .slice(0, limitPerMacro)
      .map((testCase) => toItem(testCase, route, kind)),
  );
}

export function planBuiltInAi50000Phase3WebDomainSample(): BuiltInAi50000Phase3SampleItem[] {
  const domainIds = fullDomainIds();
  return domainIds.map((domainId, index) => {
    if (index < 250) return toItem(firstEstimateForDomain(domainId), "/chat", "web_domain");
    if (index < 325) return toItem(firstEstimateForDomain(domainId), "/ai?context=foreman", "web_domain");
    if (index < 425) return toItem(firstEstimateForDomain(domainId), "/request", "web_domain");
    if (index < 475) return toItem(firstProductForDomain(domainId), "/product/search", "web_domain");
    return toItem(firstEstimateForDomain(domainId), "/pdf-viewer", "web_domain");
  });
}

export function planBuiltInAi50000Phase3AndroidDomainSample(): BuiltInAi50000Phase3SampleItem[] {
  return BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId, macroIndex) => {
    const macroCases = BUILT_IN_AI_50000_FULL_CASES.filter((testCase) => testCase.macroDomainId === macroDomainId);
    const estimates = macroCases.filter((testCase) => testCase.intent === "estimate");
    const products = macroCases.filter((testCase) => testCase.intent === "product_search");
    return [
      ...estimates.slice(0, 4).map((testCase) => toItem(testCase, "/chat", "android_domain")),
      ...estimates.slice(4, 6).map((testCase) => toItem(testCase, "/ai?context=foreman", "android_domain")),
      ...estimates.slice(6, 8).map((testCase) => toItem(testCase, "/request", "android_domain")),
      ...products.slice(0, 1).map((testCase) => toItem(testCase, "/product/search", "android_domain")),
      toItem(estimates[8 + (macroIndex % Math.max(1, estimates.length - 8))] ?? estimates[0], "/pdf-viewer", "android_domain"),
    ];
  }).slice(0, 250);
}

export function planBuiltInAi50000Phase3RequestDraftSample(): BuiltInAi50000Phase3SampleItem[] {
  const anchors = [
    "phase1_anchor_carpet_laying_100sqm",
    "phase1_anchor_bathroom_waterproofing_30sqm",
    "phase1_anchor_roof_repair_70sqm",
    "phase1_anchor_emergency_roof_leak_repair",
  ].map((id) => toItem(caseById(id), "/request", "request_draft"));
  const fill = firstCasesByMacro(4, "/request", "request_draft");
  return uniqueById([...anchors, ...fill]).slice(0, 100);
}

export function planBuiltInAi50000Phase3ProductSearchSample(): BuiltInAi50000Phase3SampleItem[] {
  const anchors = [
    "phase1_anchor_rebar_product_search_d14",
    "phase1_anchor_asphalt_supplier_search_10000sqm",
  ].map((id) => toItem(caseById(id), "/product/search", "product_search"));
  const productCases = BUILT_IN_AI_50000_FULL_CASES
    .filter((testCase) => testCase.intent === "product_search")
    .map((testCase) => toItem(testCase, "/product/search", "product_search"));
  return uniqueById([...anchors, ...productCases]).slice(0, 100);
}

export function planBuiltInAi50000Phase3PdfViewerSample(): BuiltInAi50000Phase3SampleItem[] {
  const anchors = [
    "phase1_anchor_estimate_to_pdf",
    "phase1_anchor_asphalt_paving_1000sqm",
    "phase1_anchor_roof_repair_70sqm",
    "phase1_anchor_solar_panel_installation",
    "phase1_anchor_brick_masonry_74sqm",
  ].map((id) => toItem(caseById(id), "/pdf-viewer", "pdf_viewer"));
  const byWorkFamily = new Map<string, BuiltInAi50000Phase3SampleItem>();
  for (const testCase of BUILT_IN_AI_50000_FULL_CASES) {
    if (testCase.intent !== "estimate") continue;
    if (!byWorkFamily.has(testCase.workFamily)) {
      byWorkFamily.set(testCase.workFamily, toItem(testCase, "/pdf-viewer", "pdf_viewer"));
    }
    if (byWorkFamily.size >= 75) break;
  }
  const fill = BUILT_IN_AI_50000_FULL_CASES
    .filter((testCase) => testCase.intent === "estimate")
    .map((testCase) => toItem(testCase, "/pdf-viewer", "pdf_viewer"));
  return uniqueById([...anchors, ...byWorkFamily.values(), ...fill]).slice(0, 75);
}

export function planBuiltInAi50000Phase3DangerousSafetySample(): BuiltInAi50000Phase3SampleItem[] {
  const anchors = [
    "phase1_anchor_electrical_wiring_80sqm",
    "phase1_anchor_boiler_room_piping",
    "phase1_anchor_roof_repair_70sqm",
    "phase1_anchor_gable_roof_installation_100sqm",
    "phase1_anchor_substation_grounding",
    "phase1_anchor_micro_hydro_intake",
    "phase1_anchor_asphalt_paving_1000sqm",
    "phase1_anchor_concrete_slab_200sqm",
  ].map((id) => toItem(caseById(id), "/chat", "dangerous_safety"));
  const dangerous = BUILT_IN_AI_50000_FULL_CASES
    .filter((testCase) => testCase.dangerousWork && testCase.intent === "estimate")
    .map((testCase) => toItem(testCase, "/chat", "dangerous_safety"));
  return uniqueById([...anchors, ...dangerous]).slice(0, 50);
}

export function planBuiltInAi50000Phase3CriticalAnchors(): BuiltInAi50000Phase3CriticalAnchor[] {
  return [
    { route: "/chat", requestedPrompt: "brick_masonry 74 м²", matchedCaseId: "phase1_anchor_brick_masonry_74sqm", evidence: "manifest_anchor" },
    { route: "/chat", requestedPrompt: "gable_roof_installation 100 м²", matchedCaseId: "phase1_anchor_gable_roof_installation_100sqm", evidence: "manifest_anchor" },
    { route: "/chat", requestedPrompt: "drywall_wall_cladding 352 м²", matchedCaseId: "phase1_anchor_drywall_wall_cladding_352sqm", evidence: "manifest_anchor" },
    { route: "/chat", requestedPrompt: "laminate_laying 100 м²", matchedCaseId: "phase1_anchor_laminate_laying_100sqm", evidence: "manifest_anchor" },
    { route: "/chat", requestedPrompt: "ceramic_tile_floor_laying 174 м²", matchedCaseId: "phase1_anchor_ceramic_tile_floor_laying_174sqm", evidence: "manifest_anchor" },
    { route: "/ai?context=foreman", requestedPrompt: "asphalt_paving 1000 м²", matchedCaseId: "phase1_anchor_asphalt_paving_1000sqm", evidence: "manifest_anchor" },
    { route: "/ai?context=foreman", requestedPrompt: "rebar_installation высота 5 м", matchedCaseId: "phase1_anchor_rebar_installation_height_5m", evidence: "manifest_anchor" },
    { route: "/ai?context=foreman", requestedPrompt: "concrete_slab 200 м²", matchedCaseId: "phase1_anchor_concrete_slab_200sqm", evidence: "manifest_anchor" },
    { route: "/request", requestedPrompt: "carpet_laying 100 м²", matchedCaseId: "phase1_anchor_carpet_laying_100sqm", evidence: "manifest_anchor" },
    { route: "/request", requestedPrompt: "bathroom_waterproofing 30 м²", matchedCaseId: "phase1_anchor_bathroom_waterproofing_30sqm", evidence: "manifest_anchor" },
    { route: "/request", requestedPrompt: "roof_repair 70 м²", matchedCaseId: "phase1_anchor_roof_repair_70sqm", evidence: "manifest_anchor" },
    { route: "/request", requestedPrompt: "emergency_roof_leak_repair", matchedCaseId: "phase1_anchor_emergency_roof_leak_repair", evidence: "manifest_anchor" },
    { route: "/product/search", requestedPrompt: "арматура Ø14", matchedCaseId: "phase1_anchor_rebar_product_search_d14", evidence: "manifest_anchor" },
    { route: "/product/search", requestedPrompt: "асфальтобетон для 10000 м²", matchedCaseId: "phase1_anchor_asphalt_supplier_search_10000sqm", evidence: "manifest_anchor" },
    { route: "/product/search", requestedPrompt: "кирпич для кладки 74 м²", matchedCaseId: firstProductForDomain(caseById("phase1_anchor_brick_masonry_74sqm").domainId).id, evidence: "domain_product_case" },
    { route: "/product/search", requestedPrompt: "гипсокартон 352 м²", matchedCaseId: firstProductForDomain(caseById("phase1_anchor_drywall_wall_cladding_352sqm").domainId).id, evidence: "domain_product_case" },
    { route: "/product/search", requestedPrompt: "солнечные панели для дома", matchedCaseId: firstProductForDomain(caseById("phase1_anchor_solar_panel_installation").domainId).id, evidence: "domain_product_case" },
    { route: "/product/search", requestedPrompt: "инвертор и аккумулятор для солнечной станции", matchedCaseId: firstProductForDomain(caseById("phase1_anchor_battery_storage_installation").domainId).id, evidence: "domain_product_case" },
    { route: "/pdf-viewer", requestedPrompt: "from brick masonry estimate", matchedCaseId: "phase1_anchor_brick_masonry_74sqm", evidence: "pdf_follow_up_case" },
    { route: "/pdf-viewer", requestedPrompt: "from asphalt estimate", matchedCaseId: "phase1_anchor_asphalt_paving_1000sqm", evidence: "pdf_follow_up_case" },
    { route: "/pdf-viewer", requestedPrompt: "from roof estimate", matchedCaseId: "phase1_anchor_roof_repair_70sqm", evidence: "pdf_follow_up_case" },
    { route: "/pdf-viewer", requestedPrompt: "from solar estimate", matchedCaseId: "phase1_anchor_solar_panel_installation", evidence: "pdf_follow_up_case" },
    { route: "/pdf-viewer", requestedPrompt: "from request draft estimate", matchedCaseId: "phase1_anchor_carpet_laying_100sqm", evidence: "pdf_follow_up_case" },
  ];
}

export function planBuiltInAi50000Phase3LiveSample(): BuiltInAi50000Phase3LiveSamplePlan {
  return {
    webCases: planBuiltInAi50000Phase3WebDomainSample(),
    androidCases: planBuiltInAi50000Phase3AndroidDomainSample(),
    requestDraftCases: planBuiltInAi50000Phase3RequestDraftSample(),
    productSearchCases: planBuiltInAi50000Phase3ProductSearchSample(),
    pdfViewerCases: planBuiltInAi50000Phase3PdfViewerSample(),
    dangerousCases: planBuiltInAi50000Phase3DangerousSafetySample(),
    criticalAnchors: planBuiltInAi50000Phase3CriticalAnchors(),
  };
}

export function validateBuiltInAi50000Phase3LiveSamplePlan(plan = planBuiltInAi50000Phase3LiveSample()): string[] {
  const issues: string[] = [];
  const webDomains = new Set(plan.webCases.map((item) => item.domainId));
  const webMacros = new Set(plan.webCases.map((item) => item.macroDomainId));
  const androidMacros = new Set(plan.androidCases.map((item) => item.macroDomainId));
  const routeCount = (route: BuiltInAi50000Phase3Route) => plan.webCases.filter((item) => item.route === route).length;
  if (plan.webCases.length !== 500) issues.push(`WEB_CASE_COUNT:${plan.webCases.length}`);
  if (webDomains.size !== BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL) issues.push(`WEB_DOMAIN_COUNT:${webDomains.size}`);
  if (webMacros.size !== 25) issues.push(`WEB_MACRO_COUNT:${webMacros.size}`);
  if (plan.androidCases.length !== 250) issues.push(`ANDROID_CASE_COUNT:${plan.androidCases.length}`);
  if (androidMacros.size !== 25) issues.push(`ANDROID_MACRO_COUNT:${androidMacros.size}`);
  if (routeCount("/chat") !== 250) issues.push(`CHAT_ROUTE_COUNT:${routeCount("/chat")}`);
  if (routeCount("/ai?context=foreman") !== 75) issues.push(`FOREMAN_ROUTE_COUNT:${routeCount("/ai?context=foreman")}`);
  if (routeCount("/request") !== 100) issues.push(`REQUEST_ROUTE_COUNT:${routeCount("/request")}`);
  if (routeCount("/product/search") !== 50) issues.push(`PRODUCT_ROUTE_COUNT:${routeCount("/product/search")}`);
  if (routeCount("/pdf-viewer") !== 25) issues.push(`PDF_ROUTE_COUNT:${routeCount("/pdf-viewer")}`);
  if (plan.requestDraftCases.length !== 100) issues.push(`REQUEST_SAMPLE_COUNT:${plan.requestDraftCases.length}`);
  if (plan.productSearchCases.length !== 100) issues.push(`PRODUCT_SAMPLE_COUNT:${plan.productSearchCases.length}`);
  if (plan.pdfViewerCases.length !== 75) issues.push(`PDF_SAMPLE_COUNT:${plan.pdfViewerCases.length}`);
  if (new Set(plan.pdfViewerCases.map((item) => item.workFamily)).size < 30) issues.push("PDF_WORK_FAMILY_COVERAGE");
  if (plan.dangerousCases.length !== 50) issues.push(`DANGEROUS_SAMPLE_COUNT:${plan.dangerousCases.length}`);
  if (!plan.dangerousCases.every((item) => item.dangerousWork)) issues.push("DANGEROUS_SAMPLE_HAS_SAFE_CASE");
  const anchorIds = new Set(plan.criticalAnchors.map((item) => item.matchedCaseId));
  for (const id of [
    "phase1_anchor_brick_masonry_74sqm",
    "phase1_anchor_gable_roof_installation_100sqm",
    "phase1_anchor_drywall_wall_cladding_352sqm",
    "phase1_anchor_laminate_laying_100sqm",
    "phase1_anchor_ceramic_tile_floor_laying_174sqm",
    "phase1_anchor_asphalt_paving_1000sqm",
    "phase1_anchor_rebar_installation_height_5m",
    "phase1_anchor_concrete_slab_200sqm",
    "phase1_anchor_carpet_laying_100sqm",
    "phase1_anchor_bathroom_waterproofing_30sqm",
    "phase1_anchor_roof_repair_70sqm",
    "phase1_anchor_emergency_roof_leak_repair",
    "phase1_anchor_rebar_product_search_d14",
    "phase1_anchor_asphalt_supplier_search_10000sqm",
    "phase1_anchor_solar_panel_installation",
  ]) {
    if (!anchorIds.has(id) && !plan.webCases.some((item) => item.caseId === id)) issues.push(`CRITICAL_ANCHOR_MISSING:${id}`);
  }
  return issues;
}
