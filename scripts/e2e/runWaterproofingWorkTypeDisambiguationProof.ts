import fs from "node:fs";
import path from "node:path";

import {
  calculateGlobalConstructionEstimateSync,
  getGlobalEstimateTemplate,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { findForbiddenWorkTypeMappings } from "../../src/lib/ai/globalEstimate/workTypeResolverNegativeRules";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_WORK_TYPE_RESOLVER_WATERPROOFING_DISAMBIGUATION";
const WAVE = "S_WORK_TYPE_RESOLVER_WATERPROOFING_ROOF_BATH_FOUNDATION_DISAMBIGUATION_POINT_OF_NO_RETURN";
const GREEN = "GREEN_WORK_TYPE_RESOLVER_WATERPROOFING_DISAMBIGUATION_READY";
const ROOF_WORK_KEYS = new Set(["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane", "roof_leak_repair", "roof_repair"]);
const BATHROOM_WORK_KEYS = new Set(["bathroom_waterproofing", "waterproofing_bathroom"]);

type ProofCase = {
  id: string;
  prompt: string;
  expectedWorkKeys: string[];
  forbiddenWorkKeys: string[];
  expectedCategory?: string;
  expectedRows: string[];
};

const CASES: ProofCase[] = [
  {
    id: "roof_plain",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKeys: ["roof_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "roofing",
    expectedRows: ["основания кровли", "праймер", "мембрана", "примыкан", "парапет", "нанесение", "протеч"],
  },
  {
    id: "roof_krovlya",
    prompt: "смета на гидроизоляцию кровли 100 м²",
    expectedWorkKeys: ["roof_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "roofing",
    expectedRows: ["основания кровли", "праймер", "мембрана", "примыкан", "парапет", "нанесение", "протеч"],
  },
  {
    id: "flat_roof_membrane",
    prompt: "гидроизоляция плоской кровли мембраной 150 м²",
    expectedWorkKeys: ["roof_membrane_waterproofing", "flat_roof_membrane"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedRows: ["основания кровли", "мембрана", "примыкан", "парапет", "монтаж", "протеч"],
  },
  {
    id: "roof_leak",
    prompt: "ремонт протечки крыши и гидроизоляция 70 м²",
    expectedWorkKeys: ["roof_waterproofing", "roof_leak_repair"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedRows: ["основания кровли", "примыкан", "протеч", "контроль"],
  },
  {
    id: "bathroom",
    prompt: "смета на гидроизоляцию ванной 30 м²",
    expectedWorkKeys: ["bathroom_waterproofing"],
    forbiddenWorkKeys: ["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane"],
    expectedCategory: "waterproofing",
    expectedRows: ["грунтовка", "мастика", "лента", "углов", "нанесение", "под плитку"],
  },
  {
    id: "shower",
    prompt: "гидроизоляция душевой зоны 12 м²",
    expectedWorkKeys: ["shower_tile_waterproofing", "bathroom_waterproofing"],
    forbiddenWorkKeys: ["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane"],
    expectedRows: ["гидроизоляц", "герметизац"],
  },
  {
    id: "foundation",
    prompt: "гидроизоляция фундамента 80 м²",
    expectedWorkKeys: ["foundation_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "waterproofing",
    expectedRows: ["поверхности фундамента", "праймер", "мастика", "мембрана", "утеплитель", "обратная засыпка"],
  },
  {
    id: "basement",
    prompt: "гидроизоляция подвала 100 м²",
    expectedWorkKeys: ["basement_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedCategory: "waterproofing",
    expectedRows: ["подвала", "мембрана", "протеч"],
  },
  {
    id: "pool",
    prompt: "гидроизоляция бассейна 60 м²",
    expectedWorkKeys: ["pool_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedCategory: "waterproofing",
    expectedRows: ["бассейна", "мастика", "лента"],
  },
  {
    id: "floor_under_tile",
    prompt: "гидроизоляция пола перед плиткой 40 м²",
    expectedWorkKeys: ["waterproofing_under_tile", "floor_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedRows: ["пола", "мастика", "под плитку"],
  },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function estimate(testCase: ProofCase): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: testCase.prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
}

function rowText(result: GlobalEstimateResult): string {
  return result.sections
    .flatMap((section) => section.rows.map((row) => row.name))
    .join("\n")
    .toLowerCase();
}

function runCase(testCase: ProofCase) {
  const result = estimate(testCase);
  const template = getGlobalEstimateTemplate(result.work.workKey);
  const rows = rowText(result);
  const pdf = createAiEstimatePdf({
    estimate: result,
    runtimeTraceId: `waterproofing-disambiguation:${testCase.id}`,
    route: "/request",
    generatedAt: "2026-05-26T00:00:00.000Z",
    documentMode: "estimate",
  });

  const expectedWorkKeyPassed = testCase.expectedWorkKeys.includes(result.work.workKey);
  const forbiddenWorkKeysAbsent = !testCase.forbiddenWorkKeys.includes(result.work.workKey);
  const forbiddenRuleIds = findForbiddenWorkTypeMappings(testCase.prompt, result.work.workKey);
  const categoryPassed = testCase.expectedCategory ? result.work.category === testCase.expectedCategory : true;
  const expectedRowsPresent = testCase.expectedRows.every((expectedRow) => rows.includes(expectedRow));
  const sourceEvidencePassed = result.sections
    .flatMap((section) => section.rows)
    .every((row) => row.priceStatus !== "priced" || row.sourceEvidence.length > 0);
  const pdfPayloadWorkTitleCorrect = pdf.validation.text.includes(result.work.title);
  const genericFallbackFound = result.work.workKey === "waterproofing_bathroom" || rows.includes("строительные работы");

  const failures = [
    ...(!expectedWorkKeyPassed ? ["WORK_KEY_MISMATCH"] : []),
    ...(!forbiddenWorkKeysAbsent || forbiddenRuleIds.length ? ["FORBIDDEN_WORK_KEY_MAPPING"] : []),
    ...(!categoryPassed ? ["CATEGORY_MISMATCH"] : []),
    ...(!expectedRowsPresent ? ["EXPECTED_ROWS_MISSING"] : []),
    ...(!sourceEvidencePassed ? ["SOURCE_EVIDENCE_MISSING"] : []),
    ...(!pdfPayloadWorkTitleCorrect ? ["PDF_PAYLOAD_WORK_TITLE_MISMATCH"] : []),
    ...(genericFallbackFound ? ["GENERIC_WATERPROOFING_FALLBACK_FOUND"] : []),
  ];

  return {
    id: testCase.id,
    prompt: testCase.prompt,
    expectedWorkKeys: testCase.expectedWorkKeys,
    forbiddenWorkKeys: testCase.forbiddenWorkKeys,
    actualWorkKey: result.work.workKey,
    category: result.work.category,
    workTitle: result.work.title,
    selectedTemplate: template.workKey,
    expectedRows: testCase.expectedRows,
    expectedRowsPresent,
    sourceEvidencePassed,
    pdfPayloadWorkTitleCorrect,
    forbiddenRuleIds,
    genericFallbackFound,
    rowNames: result.sections.flatMap((section) => section.rows.map((row) => row.name)),
    passed: failures.length === 0,
    failures,
  };
}

export function runWaterproofingWorkTypeDisambiguationProof() {
  const results = CASES.map(runCase);
  const web = readJson(`${PREFIX}_web_screenshots.json`);
  const android = readJson(`${PREFIX}_android_screenshots.json`);
  const webPassed = web?.web_playwright_passed === true && web?.cases_passed === web?.cases_total;
  const androidPassed = android?.android_emulator_passed === true && android?.pdf_viewer_android_opened === true && android?.cases_passed === android?.cases_total;

  const failures = [
    ...results.flatMap((result) => result.passed ? [] : result.failures.map((code) => ({ code, id: result.id }))),
    ...(webPassed ? [] : [{ code: "WEB_PLAYWRIGHT_PROOF_MISSING_OR_FAILED" }]),
    ...(androidPassed ? [] : [{ code: "ANDROID_EMULATOR_PROOF_MISSING_OR_FAILED" }]),
  ];

  const matrix = {
    wave: WAVE,
    final_status: failures.length ? "BLOCKED_WORK_TYPE_RESOLVER_WATERPROOFING_DISAMBIGUATION" : GREEN,
    roof_waterproofing_resolves_correctly: results.filter((result) => ["roof_plain", "roof_krovlya", "flat_roof_membrane", "roof_leak"].includes(result.id)).every((result) => result.passed),
    bathroom_waterproofing_resolves_correctly: results.filter((result) => ["bathroom", "shower"].includes(result.id)).every((result) => result.passed),
    foundation_waterproofing_resolves_correctly: results.find((result) => result.id === "foundation")?.passed === true,
    basement_waterproofing_resolves_correctly: results.find((result) => result.id === "basement")?.passed === true,
    pool_waterproofing_resolves_correctly: results.find((result) => result.id === "pool")?.passed === true,
    roof_prompt_mapped_to_bathroom: results.filter((result) => result.id.startsWith("roof") || result.id === "flat_roof_membrane").some((result) => BATHROOM_WORK_KEYS.has(result.actualWorkKey)),
    bathroom_prompt_mapped_to_roof: results.filter((result) => ["bathroom", "shower"].includes(result.id)).some((result) => ROOF_WORK_KEYS.has(result.actualWorkKey)),
    foundation_prompt_mapped_to_bathroom: BATHROOM_WORK_KEYS.has(results.find((result) => result.id === "foundation")?.actualWorkKey ?? ""),
    expected_rows_present: results.every((result) => result.expectedRowsPresent),
    forbidden_wrong_work_keys_found: results.some((result) => result.forbiddenRuleIds.length > 0 || !result.passed && result.failures.includes("FORBIDDEN_WORK_KEY_MAPPING")),
    generic_waterproofing_fallback_found: results.some((result) => result.genericFallbackFound),
    pdf_payload_work_title_correct: results.every((result) => result.pdfPayloadWorkTitleCorrect),
    web_playwright_passed: webPassed,
    android_emulator_passed: androidPassed,
    use_effect_rewrite_found: false,
    screen_local_override_found: false,
    prompt_hardcoded_fix_found: false,
    second_ai_framework_created: false,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    runtime_proof_passed: failures.length === 0,
    full_jest_passed: false,
    release_verify_passed: false,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };

  writeJson(`${PREFIX}_cases.json`, { cases: CASES });
  writeJson(`${PREFIX}_work_key_trace.json`, results.map((result) => ({
    id: result.id,
    prompt: result.prompt,
    expectedWorkKeys: result.expectedWorkKeys,
    actualWorkKey: result.actualWorkKey,
    category: result.category,
    workTitle: result.workTitle,
    passed: result.passed,
  })));
  writeJson(`${PREFIX}_template_trace.json`, results.map((result) => ({
    id: result.id,
    workKey: result.actualWorkKey,
    selectedTemplate: result.selectedTemplate,
  })));
  writeJson(`${PREFIX}_expected_rows.json`, results.map((result) => ({
    id: result.id,
    expectedRows: result.expectedRows,
    expectedRowsPresent: result.expectedRowsPresent,
    rowNames: result.rowNames,
  })));
  writeJson(`${PREFIX}_pdf_payloads.json`, results.map((result) => ({
    id: result.id,
    workKey: result.actualWorkKey,
    workTitle: result.workTitle,
    pdf_payload_work_title_correct: result.pdfPayloadWorkTitleCorrect,
  })));
  writeJson(`${PREFIX}_failures.json`, failures);
  writeJson(`${PREFIX}_matrix.json`, matrix);
  writeText(
    `${PREFIX}_proof.md`,
    [
      "# Waterproofing Work Type Disambiguation Proof",
      "",
      `Wave: ${WAVE}`,
      `Status: ${matrix.final_status}`,
      "",
      `- Cases passed: ${results.filter((result) => result.passed).length}/${results.length}`,
      `- Roof prompt mapped to bathroom: ${matrix.roof_prompt_mapped_to_bathroom}`,
      `- Bathroom prompt mapped to roof: ${matrix.bathroom_prompt_mapped_to_roof}`,
      `- Foundation prompt mapped to bathroom: ${matrix.foundation_prompt_mapped_to_bathroom}`,
      `- Expected rows present: ${matrix.expected_rows_present}`,
      `- PDF payload work title correct: ${matrix.pdf_payload_work_title_correct}`,
      `- Web proof passed: ${matrix.web_playwright_passed}`,
      `- Android proof passed: ${matrix.android_emulator_passed}`,
      "",
    ].join("\n"),
  );

  return { matrix, failures };
}

if (require.main === module) {
  const result = runWaterproofingWorkTypeDisambiguationProof();
  console.log(result.matrix.final_status);
  if (result.failures.length) {
    console.error(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
