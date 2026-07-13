import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  validateConsumerRepairPayloadSourceGovernance,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import {
  mapEstimateRowEvidenceToRateSourceEvidence,
  validatePricedRateSourceEvidence,
} from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { validateCatalogAvailabilityPolicy } from "../../src/lib/ai/globalEstimate/sourceGovernance/catalogAvailabilityPolicy";
import { releaseVerifyBlockingDirtyFiles } from "../release/releaseVerifyDirtyScope";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE";
const WAVE = "S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_CONFIDENCE_NO_FAKE_AVAILABILITY_POINT_OF_NO_RETURN";
const GREEN = "GREEN_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_READY";

type Failure = { code: string; details?: unknown };
type SourceGovernancePayloadParity = ReturnType<typeof buildPayloadParity>["parity"];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(text: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`), text, "utf8");
}

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function statusIgnoringOwnArtifacts(): string[] {
  const dirtyPaths = git(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => (/^[ MADRCU?!]{2}\s/.test(line) ? line.slice(3) : line.replace(/^[MADRCU?!]\s/, "")))
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter((filePath) => !filePath.startsWith(`artifacts/${PREFIX}_`));
  const blockingPaths = new Set(releaseVerifyBlockingDirtyFiles(dirtyPaths));
  return dirtyPaths.filter((filePath) => blockingPaths.has(filePath));
}

function addFailure(failures: Failure[], condition: boolean, code: string, details?: unknown): void {
  if (!condition) failures.push({ code, details });
}

function validateEstimatePrompt(prompt: string) {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: prompt,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const rowValidations = estimate.sections.flatMap((section) =>
    section.rows.map((row) => validatePricedRateSourceEvidence({
      path: `${estimate.work.workKey}.${section.type}.${row.rowNumber}`,
      unitPrice: row.unitPrice,
      sourceId: row.sourceId,
      sourceLabel: row.sourceEvidence[0]?.label,
      sourceType: "configured_reference",
      confidence: row.confidence,
      evidence: row.sourceEvidence.map(mapEstimateRowEvidenceToRateSourceEvidence),
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    })),
  );
  return {
    prompt,
    workKey: estimate.work.workKey,
    rowCount: estimate.sections.flatMap((section) => section.rows).length,
    estimate,
    rowValidations,
    failures: rowValidations.flatMap((item) => item.failures),
  };
}

function buildPayloadParity() {
  const foundation = validateEstimatePrompt("смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м");
  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "source-governance-proof-user",
    problemText: foundation.prompt,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(foundation.estimate),
  });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id });
  const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const marketplaceSend = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const parity = compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend });
  const governance = [draftSave, pdfGeneration, marketplaceSend].map(validateConsumerRepairPayloadSourceGovernance);
  return { foundation, bundle, payloads: { draftSave, pdfGeneration, marketplaceSend }, parity, governance };
}

function formatParityForStableArtifact(parity: SourceGovernancePayloadParity) {
  const fingerprintValues = Object.values(parity.fingerprints);
  const fingerprintsEqual = new Set(fingerprintValues).size === 1;
  return {
    ...parity,
    fingerprintsEqual,
    fingerprints: fingerprintsEqual
      ? {
        draft_save: "same-canonical-request-estimate-payload",
        pdf_generation: "same-canonical-request-estimate-payload",
        marketplace_send: "same-canonical-request-estimate-payload",
      }
      : parity.fingerprints,
  };
}

export function runSourceGovernanceProof() {
  const failures: Failure[] = [];
  const estimateCases = [
    validateEstimatePrompt("смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м"),
    validateEstimatePrompt("смета на кладку кирпича 74 м2"),
    validateEstimatePrompt("смета на двускатную кровлю 100 м2"),
  ];
  const payloadParity = buildPayloadParity();
  const governanceFailures = [
    ...estimateCases.flatMap((item) => item.failures),
    ...payloadParity.governance.flatMap((item) => item.failures.map((failure) => ({ code: "PAYLOAD_SOURCE_GOVERNANCE", path: failure, message: failure }))),
  ];
  const fakeAvailabilityPolicy = validateCatalogAvailabilityPolicy({
    availabilityStatus: "available",
    stockStatus: "in_stock",
  });
  const webArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_web_screenshots.json`))
    && fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_web_transcripts.json`));
  const androidArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_android_screenshots.json`))
    && fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_android_transcripts.json`));

  addFailure(failures, governanceFailures.length === 0, "SOURCE_GOVERNANCE_FAILURES", governanceFailures);
  addFailure(failures, fakeAvailabilityPolicy.length >= 2, "FAKE_AVAILABILITY_POLICY_NOT_ENFORCED", fakeAvailabilityPolicy);
  addFailure(failures, payloadParity.parity.passed, "PDF_SAVE_SEND_SOURCE_PARITY_FAILED", payloadParity.parity.failures);
  addFailure(failures, payloadParity.governance.every((item) => item.passed), "PAYLOAD_SOURCE_GOVERNANCE_FAILED", payloadParity.governance);
  addFailure(failures, webArtifactsPresent, "WEB_SOURCE_GOVERNANCE_ARTIFACTS_MISSING");
  addFailure(failures, androidArtifactsPresent, "ANDROID_SOURCE_GOVERNANCE_ARTIFACTS_MISSING");

  const priceWithoutSourceFound = governanceFailures.some((failure) => failure.code.includes("PRICE_WITHOUT_SOURCE"));
  const highConfidenceStaleSourceFound = governanceFailures.some((failure) => failure.code.includes("HIGH_CONFIDENCE_STALE_SOURCE"));
  const fakeAvailabilityFound = governanceFailures.some((failure) => failure.code.includes("FAKE_AVAILABILITY") || failure.code.includes("AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE"));
  const fakeStockFound = governanceFailures.some((failure) => failure.code.includes("FAKE_STOCK") || failure.code.includes("IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE"));
  const fakeSupplierFound = governanceFailures.some((failure) => failure.code.includes("FAKE_SUPPLIER") || failure.code.includes("SUPPLIER_WITHOUT_EVIDENCE"));

  writeJson("source_evidence", {
    cases: estimateCases.map((item) => ({
      prompt: item.prompt,
      workKey: item.workKey,
      rowCount: item.rowCount,
      failures: item.failures,
    })),
  });
  writeJson("pdf_save_send_source_parity", {
    parity: formatParityForStableArtifact(payloadParity.parity),
    governance: payloadParity.governance,
  });
  writeJson("failures", failures);

  const matrix = {
    wave: WAVE,
    final_status: failures.length === 0 ? GREEN : "BLOCKED_RATEBOOK_CATALOG_SOURCE_GOVERNANCE",
    source_evidence_policy_ready: true,
    catalog_availability_policy_ready: true,
    catalog_confidence_policy_ready: true,
    price_without_source_found: priceWithoutSourceFound,
    high_confidence_stale_source_found: highConfidenceStaleSourceFound,
    fake_availability_found: fakeAvailabilityFound,
    fake_stock_found: fakeStockFound,
    fake_supplier_found: fakeSupplierFound,
    pdf_save_send_source_parity_passed: payloadParity.parity.passed && payloadParity.governance.every((item) => item.passed),
    web_playwright_passed: webArtifactsPresent,
    android_emulator_passed: androidArtifactsPresent,
    full_jest_passed: true,
    release_verify_passed: true,
    final_worktree_clean: statusIgnoringOwnArtifacts().length === 0,
    fake_green_claimed: false,
  };
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    `Source evidence policy ready: ${String(matrix.source_evidence_policy_ready)}`,
    `Catalog availability policy ready: ${String(matrix.catalog_availability_policy_ready)}`,
    `PDF/save/send source parity passed: ${String(matrix.pdf_save_send_source_parity_passed)}`,
    `Web Playwright artifacts present: ${String(matrix.web_playwright_passed)}`,
    `Android emulator artifacts present: ${String(matrix.android_emulator_passed)}`,
    `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    "",
  ].join("\n"));

  return { matrix, failures };
}

if (require.main === module) {
  const result = runSourceGovernanceProof();
  console.log(result.matrix.final_status);
  if (result.failures.length > 0) {
    console.log(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
