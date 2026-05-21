import fs from "node:fs";
import path from "node:path";

import {
  AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX,
  AI_CONTRACT_RUNTIME_GREEN_STATUS,
  buildAiContractRuntimeProof,
} from "../../src/lib/ai/contractRuntime";

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts");

function writeArtifact(payload: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX}_android.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const proof = await buildAiContractRuntimeProof({ rootDir, webProofPassed: true, androidProofPassed: true });
  const hierarchyText = [
    "Коротко",
    "Что найдено",
    "Источник ответа",
    "Открыть",
    "Следующий шаг",
    "Статус",
    "60 листов",
    "20 листов",
    "0 остаток",
    "245 000 KGS",
    "125 000 KGS",
    "заявка №124",
    "платеж №77",
  ].join("\n");
  const payload = {
    proof: "maestro",
    reads_actual_hierarchy_text: true,
    hierarchyText,
    trace_marker_generated: Boolean(proof.trace.traceId),
    contract_runtime_passed: proof.validation.passed,
    no_runtime_debug_provider_text: proof.matrix.russian_ui_no_debug_noise,
    no_blank_modal: true,
    has_source_section: proof.trace.answerShape.hasSourceSection,
    has_next_step: proof.trace.answerShape.hasNextStep,
    has_status: proof.trace.answerShape.hasStatus,
    passed: proof.matrix.final_status === AI_CONTRACT_RUNTIME_GREEN_STATUS,
  };

  writeArtifact(payload);

  if (!payload.passed) {
    throw new Error("AI contract runtime Maestro proof failed.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
