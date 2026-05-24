import fs from "node:fs";
import path from "node:path";

import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_FORMULA";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function read(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

export function runRequestAiEstimateProfessionalBoqFormulaAudit() {
  const calculator = read("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
  const seed = read("src/lib/ai/globalEstimate/globalEstimateSeedData.ts");
  const parser = read("src/lib/ai/globalEstimate/stripFoundationDimensions.ts");
  const depthPolicy = read("src/lib/ai/globalEstimate/estimateBoqDepthPolicy.ts");
  const depthValidator = read("src/lib/ai/globalEstimate/validateEstimateBoqDepth.ts");
  const formulaEngine = read("src/lib/ai/globalEstimate/estimateFormulaQualityEngine.ts");
  const requestScreen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");

  const result = calculateGlobalConstructionEstimateSync({
    text: PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const rows = result.sections.flatMap((section) => section.rows);
  const concrete = rows.find((row) => row.code === "strip_foundation_concrete_m300");
  const depth = validateEstimateBoqDepth(result);
  const formula = validateEstimateFormulaQuality(result);

  const currentFlow = {
    wave: "S_REQUEST_AI_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_FORMULA_QUALITY_ENGINE_NO_HACKS_POINT_OF_NO_RETURN",
    route: "/request",
    estimate_calculator: "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    strip_foundation_parser: "src/lib/ai/globalEstimate/stripFoundationDimensions.ts",
    boq_depth_policy: "src/lib/ai/globalEstimate/estimateBoqDepthPolicy.ts",
    formula_quality_engine: "src/lib/ai/globalEstimate/estimateFormulaQualityEngine.ts",
    request_screen_owns_formula_math: /strip_foundation_concrete_volume_m3|length \* width \* height|32\.64/.test(requestScreen),
    second_ai_framework_created: /new\s+OpenAI|createOpenAI|chat\.completions|responses\.create/.test(formulaEngine),
    fake_green_claimed: false,
  };

  const foundationCase = {
    prompt: PROMPT,
    work: result.work,
    input: result.input,
    rowCount: rows.length,
    concrete: concrete
      ? {
        code: concrete.code,
        quantity: concrete.quantity,
        unit: concrete.unit,
        displayQuantity: concrete.displayQuantity,
      }
      : null,
    sectionTypes: result.sections.map((section) => section.type),
    fake_green_claimed: false,
  };

  const formulaTrace = {
    prompt: PROMPT,
    expected_formula: "48 * 0.4 * 1.7",
    expected_concrete_volume_m3: 32.64,
    validation: formula,
    fake_green_claimed: false,
  };

  const failures = [
    calculator.includes("buildStripFoundationQuantityContext") ? null : "FOUNDATION_QUANTITY_CONTEXT_NOT_USED",
    seed.includes("STRIP_FOUNDATION_TEMPLATE") ? null : "STRIP_FOUNDATION_TEMPLATE_MISSING",
    parser.includes("parseStripFoundationDimensions") ? null : "FOUNDATION_DIMENSION_PARSER_MISSING",
    depthPolicy.includes("foundation: 12") ? null : "FOUNDATION_MINIMUM_ROW_POLICY_MISSING",
    depthValidator.includes("BOQ_DEPTH_TOO_SHORT") ? null : "BOQ_DEPTH_VALIDATOR_MISSING",
    formulaEngine.includes("validateEstimateFormulaQuality") ? null : "FORMULA_QUALITY_ENGINE_MISSING",
    result.work.workKey === "strip_foundation" ? null : "FOUNDATION_WORK_KEY_NOT_STRIP_FOUNDATION",
    result.input.dimensions?.concreteVolumeM3 === 32.64 && concrete?.quantity === 32.64 ? null : "FOUNDATION_CONCRETE_VOLUME_WRONG",
    depth.passed && depth.actualRows >= 12 ? null : "BOQ_DEPTH_TOO_SHORT",
    formula.passed ? null : "FORMULA_QUALITY_VALIDATION_FAILED",
    currentFlow.request_screen_owns_formula_math ? "SCREEN_LOCAL_FOUNDATION_FORMULA_FOUND" : null,
    currentFlow.second_ai_framework_created ? "SECOND_AI_FRAMEWORK_FOUND" : null,
  ].filter((item): item is string => Boolean(item));

  writeJson(`${PREFIX}_AUDIT_current_flow.json`, currentFlow);
  writeJson(`${PREFIX}_foundation_case.json`, foundationCase);
  writeJson(`${PREFIX}_foundation_formula_trace.json`, formulaTrace);
  writeJson(`${PREFIX}_boq_depth_validation.json`, depth);
  writeJson(`${PREFIX}_failures.json`, failures.map((code) => ({ code })));

  return {
    currentFlow,
    foundationCase,
    formulaTrace,
    depth,
    failures,
  };
}

if (require.main === module) {
  const result = runRequestAiEstimateProfessionalBoqFormulaAudit();
  console.log(result.failures.length === 0 ? "GREEN_REQUEST_AI_ESTIMATE_BOQ_FORMULA_AUDIT_READY" : "BLOCKED_REQUEST_AI_ESTIMATE_BOQ_FORMULA_AUDIT");
  if (result.failures.length > 0) {
    console.error(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
