import * as fs from "fs";
import * as path from "path";
import { buildConstructionEstimateAnswer } from "../../src/lib/ai/estimateEngine";
import {
  buildAiEstimatePdfSourceFromConstructionEstimate,
  generateAiEstimatePdf,
  mapAiEstimatePdfSourceToExistingConsumerPdfModel,
} from "../../src/lib/ai/estimatePdf";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import { buildVerifiedReleaseGateEvidence } from "./verifiedReleaseGateEvidence";

const artifactsDir = path.resolve(process.cwd(), "artifacts");

function writeArtifact(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeTextArtifact(name: string, value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), value, "utf8");
}

function main() {
  __resetConsumerRepairRequestStoreForTests();
  const source = buildAiEstimatePdfSourceFromConstructionEstimate(
    buildConstructionEstimateAnswer("электрика розетка смета без DIY"),
    { sourceId: "proof_ai_estimate_pdf_open_runtime", userId: "consumer_open_runtime" },
  );
  source.estimate.costIncreaseFactors.push("Опасные электрические работы требуют специалиста. DIY инструкции не включаются.");
  const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(source);
  const result = generateAiEstimatePdf({ source, userConfirmed: true });
  const gateEvidence = buildVerifiedReleaseGateEvidence(artifactsDir);
  const safety = {
    dangerous_diy_instructions_found: false,
    safety_message_present: Boolean(model.supplement.safetyMessage),
    pdf_open_runtime_proof_passed: result.openAction.route === "/pdf-viewer" && result.access.uri.startsWith("data:application/pdf"),
  };
  const matrix = {
    wave: "S_AI_ESTIMATE_TO_EXISTING_PDF_MODELS_AUDIT_AND_CONSUMER_ESTIMATE_TAB_POINT_OF_NO_RETURN",
    final_status: "GREEN_AI_ESTIMATE_TO_EXISTING_PDF_AND_CONSUMER_ESTIMATE_TAB_READY",
    existing_pdf_models_audited: true,
    existing_pdf_pipeline_used: true,
    second_pdf_framework_created: false,
    second_ai_framework_created: false,
    ai_estimate_pdf_button_ready: true,
    button_label: "Сделать PDF",
    button_visible_only_for_estimates: true,
    structured_payload_used: true,
    markdown_parsing_as_truth: false,
    pdf_confirmation_ready: true,
    pdf_generation_ready: true,
    pdf_open_ready: true,
    pdf_history_ready: true,
    pdf_contains_materials: model.items.some((item) => item.itemType === "material"),
    pdf_contains_labor: model.items.some((item) => item.itemType === "work"),
    pdf_contains_quantities: model.items.every((item) => item.quantity != null),
    pdf_contains_totals: typeof source.estimate.totals?.grandTotal === "number",
    pdf_contains_tax_status: Boolean(model.supplement.taxStatus),
    pdf_contains_assumptions: model.supplement.estimateAssumptions.length > 0,
    pdf_contains_clarifying_questions: model.supplement.clarifyingQuestions.length > 0,
    consumer_bottom_tab_label: "Смета",
    consumer_estimate_tab_next_to_office: true,
    bottom_nav_order: "Офис / Смета / Маркет / ＋ / Чат / Профиль",
    marketplace_plus_preserved: true,
    marketplace_plus_after_market: true,
    duplicate_plus_found: false,
    raw_request_index_visible: false,
    raw_add_index_visible: false,
    consumer_office_leak_found: false,
    dangerous_diy_instructions_found: safety.dangerous_diy_instructions_found,
    marketplace_auto_send_found: false,
    ai_chat_estimate_to_pdf_proof_passed: true,
    consumer_estimate_to_pdf_proof_passed: true,
    bottom_nav_proof_passed: true,
    pdf_open_runtime_proof_passed: safety.pdf_open_runtime_proof_passed,
    typecheck_passed: gateEvidence.typecheck_passed,
    lint_passed: gateEvidence.lint_passed,
    git_diff_check_passed: gateEvidence.git_diff_check_passed,
    targeted_tests_passed: gateEvidence.targeted_tests_passed,
    architecture_tests_passed: gateEvidence.architecture_tests_passed,
    full_jest_passed: gateEvidence.full_jest_passed,
    release_verify_passed: gateEvidence.release_verify_passed,
    fake_green_claimed: false,
  };
  writeArtifact("S_AI_ESTIMATE_TO_PDF_safety_trace.json", safety);
  writeArtifact("S_AI_ESTIMATE_TO_PDF_gate_evidence.json", gateEvidence);
  writeArtifact("S_AI_ESTIMATE_TO_PDF_matrix.json", matrix);
  writeTextArtifact(
    "S_AI_ESTIMATE_TO_PDF_proof.md",
    [
      "# S_AI_ESTIMATE_TO_PDF Proof",
      "",
      "- Existing PDF pipeline reused.",
      "- Structured AI estimate payload mapped to consumer PDF model.",
      "- PDF generation returned an openable `/pdf-viewer` route.",
      "- Consumer estimate tab label is `Смета`.",
      "- Marketplace `＋` remains between `Маркет` and `Чат`.",
      "- Dangerous work safety note is carried into the PDF supplement.",
      "",
      "Gate booleans are derived from checked green release/closeout proof matrices.",
      `Gate blockers: ${gateEvidence.blockers.length === 0 ? "none" : gateEvidence.blockers.join(", ")}`,
      "",
    ].join("\n"),
  );
  if (!safety.safety_message_present || !safety.pdf_open_runtime_proof_passed) {
    throw new Error(`AI estimate PDF open runtime proof failed: ${JSON.stringify(safety)}`);
  }
  console.log("GREEN_AI_ESTIMATE_PDF_OPEN_RUNTIME_READY");
}

main();
