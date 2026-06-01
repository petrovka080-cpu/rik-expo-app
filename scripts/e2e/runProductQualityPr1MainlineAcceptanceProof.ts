import fs from "node:fs";
import path from "node:path";

import {
  estimateFor,
  pdfFor,
  presentationFor,
} from "../../tests/entrypoints/liveB2cEstimateRealityTestHelpers";
import {
  CONCRETE_PEDESTAL_PROMPT,
  FORBIDDEN_PEDESTAL_ROW_TOKENS,
  REQUIRED_PEDESTAL_ROW_TOKENS,
  estimateRowText,
} from "../../tests/professionalQuality/concretePedestalTestHelpers";

export const PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_GREEN_STATUS =
  "GREEN_PRODUCT_QUALITY_PR1_MAINLINE_ACCEPTANCE_READY";
export const PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_BLOCKED_STATUS =
  "BLOCKED_PRODUCT_QUALITY_REGRESSION_AFTER_MERGE";

type Route = "/request" | "/ai?context=foreman";

type SmokeCase = {
  id: string;
  route: Route;
  prompt: string;
  expectedWorkKey: string;
  minRows: number;
  requiredTokens?: readonly string[];
  forbiddenTokens?: readonly string[];
  requirePdf?: boolean;
};

type SmokeCaseResult = {
  id: string;
  route: Route;
  prompt: string;
  expectedWorkKey: string;
  actualWorkKey: string | null;
  passed: boolean;
  rowCount: number;
  blockers: string[];
};

type MainlineAcceptanceMatrix = {
  final_status: typeof PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_GREEN_STATUS | typeof PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_BLOCKED_STATUS;
  concrete_pedestal_estimate_passed: boolean;
  concrete_pedestal_maps_to: string | null;
  concrete_pedestal_wrongly_mapped_to_slab: boolean;
  drainage_channel_estimate_passed: boolean;
  passenger_elevator_estimate_passed: boolean;
  metal_canopy_estimate_passed: boolean;
  paving_stone_estimate_passed: boolean;
  roof_waterproofing_estimate_passed: boolean;
  linoleum_estimate_passed: boolean;
  pdf_table_payload_passed: boolean;
  mojibake_found: boolean;
  weak_generic_rows_found: boolean;
  exact_prompt_lookup_found: boolean;
  fake_green_claimed: false;
  product_logic_changed: true;
  estimate_engine_changed: true;
  boq_compiler_changed: true;
  pdf_renderer_changed: false;
  ui_rewrite_found: false;
  owner_gate_deleted: false;
  owner_gate_globally_optional: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
  app_review_submitted: false;
  owner_session_verified: false;
  real_external_traffic: false;
  testflight_acceptance: false;
  android_installed_artifact_acceptance: false;
};

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_PRODUCT_QUALITY_PR1_MAINLINE_ACCEPTANCE");

const SMOKE_CASES: readonly SmokeCase[] = [
  {
    id: "concrete_pedestal_request",
    route: "/request",
    prompt: CONCRETE_PEDESTAL_PROMPT,
    expectedWorkKey: "concrete_pedestal_pour",
    minRows: 18,
    requiredTokens: REQUIRED_PEDESTAL_ROW_TOKENS,
    forbiddenTokens: FORBIDDEN_PEDESTAL_ROW_TOKENS,
    requirePdf: true,
  },
  {
    id: "concrete_pedestal_foreman",
    route: "/ai?context=foreman",
    prompt: CONCRETE_PEDESTAL_PROMPT,
    expectedWorkKey: "concrete_pedestal_pour",
    minRows: 18,
    requiredTokens: REQUIRED_PEDESTAL_ROW_TOKENS,
    forbiddenTokens: FORBIDDEN_PEDESTAL_ROW_TOKENS,
  },
  {
    id: "linoleum",
    route: "/request",
    prompt: "Хочу уложить линолеум на 100 кв м",
    expectedWorkKey: "linoleum_laying",
    minRows: 12,
  },
  {
    id: "drainage_channel",
    route: "/request",
    prompt: "смета на устройство дренажных каналов 80 пог м",
    expectedWorkKey: "drainage_channel_installation",
    minRows: 18,
  },
  {
    id: "passenger_elevator",
    route: "/request",
    prompt: "смета на пассажирский лифт 1 комплект",
    expectedWorkKey: "passenger_elevator_installation",
    minRows: 35,
  },
  {
    id: "metal_canopy",
    route: "/request",
    prompt: "смета на металлический навес на площади 647 кв метров",
    expectedWorkKey: "metal_canopy_installation",
    minRows: 18,
  },
  {
    id: "paving_stone",
    route: "/request",
    prompt: "укладка брусчатки 587 кв м",
    expectedWorkKey: "paving_stone_laying",
    minRows: 18,
  },
  {
    id: "roof_waterproofing",
    route: "/request",
    prompt: "гидроизоляция крыши 100 кв м",
    expectedWorkKey: "roof_waterproofing",
    minRows: 12,
  },
];

const WEAK_STANDALONE_ROWS = new Set([
  "material",
  "work",
  "works",
  "installation",
  "other",
  "материал",
  "работы",
  "монтаж",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
]);

const RUNTIME_EXACT_LOOKUP_FILES = [
  "src/lib/ai/estimatorKernel/buildEstimatorReasoningPlan.ts",
  "src/lib/ai/estimatorKernel/isParsableConstructionWork.ts",
  "src/lib/ai/constructionFormulas/constructionFormulaRegistry.ts",
  "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
  "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
  "src/lib/ai/globalEstimate/globalWorkTypeResolver.ts",
] as const;

function writeJson(relativePath: string, value: unknown): void {
  const outputPath = path.join(ARTIFACT_DIR, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath: string, value: string): void {
  const outputPath = path.join(ARTIFACT_DIR, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function containsAll(text: string, tokens: readonly string[]): string[] {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return tokens.filter((token) => !normalized.includes(token.toLocaleLowerCase("ru-RU")));
}

function containsForbidden(text: string, tokens: readonly string[]): string[] {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return tokens.filter((token) => normalized.includes(token.toLocaleLowerCase("ru-RU")));
}

function rowNamesAreWeak(text: string): boolean {
  return text
    .split("\n")
    .map((item) => item.trim().toLocaleLowerCase("ru-RU"))
    .some((item) => WEAK_STANDALONE_ROWS.has(item));
}

function runtimeExactPromptLookupFound(): boolean {
  return RUNTIME_EXACT_LOOKUP_FILES.some((relativePath) => {
    const content = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    return content.includes(CONCRETE_PEDESTAL_PROMPT);
  });
}

function runCase(input: SmokeCase): SmokeCaseResult {
  const blockers: string[] = [];
  let actualWorkKey: string | null = null;
  let rowCount = 0;
  try {
    const estimate = estimateFor(input.route, input.prompt);
    actualWorkKey = estimate.work.workKey;
    rowCount = estimate.sections.flatMap((section) => section.rows).length;
    if (actualWorkKey !== input.expectedWorkKey) blockers.push(`WORK_KEY_MISMATCH:${actualWorkKey}:${input.expectedWorkKey}`);
    if (rowCount < input.minRows) blockers.push(`ROW_DEPTH_TOO_LOW:${rowCount}:${input.minRows}`);
    const text = estimateRowText(estimate);
    for (const missing of containsAll(text, input.requiredTokens ?? [])) blockers.push(`REQUIRED_ROW_TOKEN_MISSING:${missing}`);
    for (const forbidden of containsForbidden(text, input.forbiddenTokens ?? [])) blockers.push(`FORBIDDEN_ROW_TOKEN_FOUND:${forbidden}`);
    if (rowNamesAreWeak(text)) blockers.push("WEAK_GENERIC_ROW_FOUND");
    presentationFor(estimate);
    if (input.requirePdf) {
      const pdf = pdfFor(estimate);
      if (!pdf.pdfTrace.pdf_uses_structured_global_estimate_result) blockers.push("PDF_NOT_STRUCTURED_ESTIMATE");
      if (pdf.pdfTrace.markdown_parsed_as_pdf_truth) blockers.push("PDF_MARKDOWN_AS_TRUTH");
      if (pdf.pdfTrace.pdf_mojibake_found) blockers.push("PDF_MOJIBAKE_FOUND");
      if (!pdf.pdfTrace.pdf_text_extractable) blockers.push("PDF_TEXT_NOT_EXTRACTABLE");
    }
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }

  return {
    id: input.id,
    route: input.route,
    prompt: input.prompt,
    expectedWorkKey: input.expectedWorkKey,
    actualWorkKey,
    passed: blockers.length === 0,
    rowCount,
    blockers,
  };
}

export function runProductQualityPr1MainlineAcceptanceProof(): {
  matrix: MainlineAcceptanceMatrix;
  case_results: SmokeCaseResult[];
} {
  const caseResults = SMOKE_CASES.map(runCase);
  const byId = new Map(caseResults.map((item) => [item.id, item]));
  const failures = caseResults.filter((item) => !item.passed);
  const exactPromptLookupFound = runtimeExactPromptLookupFound();
  const pdfCase = byId.get("concrete_pedestal_request");
  const weakGenericRowsFound = caseResults.some((item) => item.blockers.includes("WEAK_GENERIC_ROW_FOUND"));
  const mojibakeFound = caseResults.some((item) => item.blockers.includes("PDF_MOJIBAKE_FOUND"));
  const concreteCase = byId.get("concrete_pedestal_request");
  const finalStatus = failures.length === 0 && !exactPromptLookupFound
    ? PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_GREEN_STATUS
    : PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_BLOCKED_STATUS;

  const matrix: MainlineAcceptanceMatrix = {
    final_status: finalStatus,
    concrete_pedestal_estimate_passed: concreteCase?.passed === true,
    concrete_pedestal_maps_to: concreteCase?.actualWorkKey ?? null,
    concrete_pedestal_wrongly_mapped_to_slab: concreteCase?.actualWorkKey === "concrete_slab",
    drainage_channel_estimate_passed: byId.get("drainage_channel")?.passed === true,
    passenger_elevator_estimate_passed: byId.get("passenger_elevator")?.passed === true,
    metal_canopy_estimate_passed: byId.get("metal_canopy")?.passed === true,
    paving_stone_estimate_passed: byId.get("paving_stone")?.passed === true,
    roof_waterproofing_estimate_passed: byId.get("roof_waterproofing")?.passed === true,
    linoleum_estimate_passed: byId.get("linoleum")?.passed === true,
    pdf_table_payload_passed: pdfCase?.passed === true && !pdfCase.blockers.some((item) => item.startsWith("PDF_")),
    mojibake_found: mojibakeFound,
    weak_generic_rows_found: weakGenericRowsFound,
    exact_prompt_lookup_found: exactPromptLookupFound,
    fake_green_claimed: false,
    product_logic_changed: true,
    estimate_engine_changed: true,
    boq_compiler_changed: true,
    pdf_renderer_changed: false,
    ui_rewrite_found: false,
    owner_gate_deleted: false,
    owner_gate_globally_optional: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    app_review_submitted: false,
    owner_session_verified: false,
    real_external_traffic: false,
    testflight_acceptance: false,
    android_installed_artifact_acceptance: false,
  };

  writeJson("matrix.json", matrix);
  writeJson("failures.json", failures);
  writeJson("mainline_live_smoke.json", caseResults);
  writeJson("pdf_table_smoke.json", { passed: matrix.pdf_table_payload_passed, case: pdfCase });
  writeJson("mojibake_scan.json", { mojibake_found: mojibakeFound });
  writeText(
    "proof.md",
    [
      `Status: ${matrix.final_status}`,
      `Concrete pedestal maps to: ${matrix.concrete_pedestal_maps_to}`,
      `PDF table payload passed: ${matrix.pdf_table_payload_passed}`,
      `Mojibake found: ${matrix.mojibake_found}`,
      `Weak generic rows found: ${matrix.weak_generic_rows_found}`,
      `Exact prompt lookup found: ${matrix.exact_prompt_lookup_found}`,
      "No owner session, mobile build, TestFlight, Android installed artifact acceptance, App Review, public beta, production rollout, Real10000, or external traffic was started.",
      "Fake green claimed: false",
    ].join("\n"),
  );

  return { matrix, case_results: caseResults };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/e2e/runProductQualityPr1MainlineAcceptanceProof.ts")) {
  const report = runProductQualityPr1MainlineAcceptanceProof();
  console.log(report.matrix.final_status);
  if (report.matrix.final_status !== PRODUCT_QUALITY_MAINLINE_ACCEPTANCE_GREEN_STATUS) {
    process.exitCode = 1;
  }
}
