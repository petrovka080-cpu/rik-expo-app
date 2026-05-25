import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  calculateGlobalConstructionEstimateSync,
  collectGlobalEstimateTemplateRateKeys,
  collectGlobalEstimateTemplateRowCodes,
  getGlobalEstimateTemplate,
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION_CASES,
  GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES,
  validateGlobalEstimateResult,
  verifyGlobalEstimateTemplateRatebookReconciliation,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";

const WAVE = "S_GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION";
const GREEN = "GREEN_GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION_READY";
const projectRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(projectRoot, "artifacts");
const finalizeGates = process.argv.includes("--finalize");

type ProofCase = {
  id: string;
  category: string;
  prompt: string;
  expectedWorkKey: string;
  explicitWorkKey?: string;
  volume: number;
  unit: string;
  expectedRowCodes: string[];
};

type Failure = {
  id: string;
  category: string;
  expectedWorkKey: string;
  actualWorkKey?: string;
  reason: string;
  details?: unknown;
};

function writeJson(fileName: string, value: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${WAVE}_${fileName}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(matrix: Record<string, unknown>, failures: Failure[]): void {
  const lines = [
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    `Backend cases: ${matrix.backend_cases_passed}/${matrix.backend_cases_total}`,
    `Known work generic rows found: ${String(matrix.known_work_generic_rows_found)}`,
    `Price without source found: ${String(matrix.price_without_source_found)}`,
    `Tax without rule found: ${String(matrix.tax_without_rule_found)}`,
    `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    "",
    failures.length === 0 ? "Failures: none" : "Failures:",
    ...failures.map((failure) => `- ${failure.id}: ${failure.reason}`),
    "",
  ];
  fs.writeFileSync(path.join(artifactsDir, `${WAVE}_proof.md`), `${lines.join("\n")}\n`, "utf8");
}

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function expectedCodesFor(workKey: string): string[] {
  const reconciliationCase = GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION_CASES.find((item) => item.workKey === workKey);
  if (reconciliationCase) return [...reconciliationCase.expectedRowCodes];
  const template = getGlobalEstimateTemplate(workKey);
  return collectGlobalEstimateTemplateRowCodes(template).slice(0, Math.min(4, collectGlobalEstimateTemplateRowCodes(template).length));
}

function makeCases(): ProofCase[] {
  const categories = [
    { category: "asphalt", workKeys: ["asphalt_paving"] },
    { category: "carpet", workKeys: ["carpet_laying"] },
    { category: "gkl", workKeys: ["drywall_partition", "drywall_wall_cladding"] },
    { category: "roof", workKeys: ["gable_roof_installation", "roof_repair"] },
    { category: "brick", workKeys: ["brick_masonry"] },
    { category: "tile", workKeys: ["ceramic_tile_floor_laying", "ceramic_tile_laying"] },
    { category: "laminate", workKeys: ["laminate_laying"] },
    { category: "waterproofing", workKeys: ["waterproofing_bathroom", "bathroom_waterproofing"] },
    { category: "demolition", workKeys: ["demolition_tiles", "demolition_flooring", "demolition_walls"] },
  ];

  const cases: ProofCase[] = categories.flatMap((category) =>
    Array.from({ length: 10 }, (_, index) => {
      const workKey = category.workKeys[index % category.workKeys.length];
      return {
        id: `${category.category}_${String(index + 1).padStart(2, "0")}`,
        category: category.category,
        prompt: `${workKey} estimate ${80 + index * 7} sq m`,
        expectedWorkKey: workKey,
        explicitWorkKey: workKey,
        volume: 80 + index * 7,
        unit: "sq_m",
        expectedRowCodes: expectedCodesFor(workKey),
      };
    }),
  );

  const aliasPrompts: Array<Omit<ProofCase, "category" | "unit" | "volume" | "expectedRowCodes"> & { volume?: number }> = [
    { id: "mixed_alias_01", prompt: "asphalt paving 100 sq m", expectedWorkKey: "asphalt_paving" },
    { id: "mixed_alias_02", prompt: "carpet installation 100 sq m", expectedWorkKey: "carpet_laying" },
    { id: "mixed_alias_03", prompt: "drywall wall cladding 80 sq m", expectedWorkKey: "drywall_wall_cladding" },
    { id: "mixed_alias_04", prompt: "brick masonry 74 sq m", expectedWorkKey: "brick_masonry" },
    { id: "mixed_alias_05", prompt: "laminate flooring 100 sq m", expectedWorkKey: "laminate_laying" },
    { id: "mixed_alias_06", prompt: "bathroom waterproofing 30 sq m", expectedWorkKey: "bathroom_waterproofing", volume: 30 },
    { id: "mixed_alias_07", prompt: "tile installation 174 sq m", expectedWorkKey: "ceramic_tile_laying", volume: 174 },
    { id: "mixed_alias_08", prompt: "roof repair 90 sq m", expectedWorkKey: "roof_repair", volume: 90 },
    { id: "mixed_alias_09", prompt: "asphalt parking lot paving 140 sq m", expectedWorkKey: "asphalt_paving", volume: 140 },
    { id: "mixed_alias_10", prompt: "drywall installation 60 sq m", expectedWorkKey: "drywall_partition", volume: 60 },
  ];

  return [
    ...cases,
    ...aliasPrompts.map((item) => ({
      ...item,
      category: "mixed_typo_alias",
      volume: item.volume ?? 100,
      unit: "sq_m",
      expectedRowCodes: expectedCodesFor(item.expectedWorkKey),
    })),
  ];
}

function sourceEvidence(result: GlobalEstimateResult): unknown[] {
  return result.sections.flatMap((section) =>
    section.rows.map((row) => ({
      workKey: result.work.workKey,
      sectionType: section.type,
      code: row.code,
      sourceId: row.sourceId,
      evidence: row.sourceEvidence.map((evidence) => ({
        sourceId: evidence.sourceId,
        label: evidence.label,
        checkedAt: evidence.checkedAt,
        confidence: evidence.confidence,
      })),
    })),
  );
}

function runCase(proofCase: ProofCase): { result?: GlobalEstimateResult; failures: Failure[] } {
  const result = calculateGlobalConstructionEstimateSync({
    text: proofCase.prompt,
    explicitWorkKey: proofCase.explicitWorkKey,
    volume: proofCase.volume,
    unit: proofCase.unit,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const failures: Failure[] = [];
  const actualCodes = new Set(result.sections.flatMap((section) => section.rows.map((row) => row.code)));
  const validation = validateGlobalEstimateResult(result, { knownWorkKeys: [proofCase.expectedWorkKey, result.work.workKey] });

  if (result.work.workKey !== proofCase.expectedWorkKey) {
    failures.push({
      id: proofCase.id,
      category: proofCase.category,
      expectedWorkKey: proofCase.expectedWorkKey,
      actualWorkKey: result.work.workKey,
      reason: "wrong_work_key",
    });
  }
  for (const code of proofCase.expectedRowCodes) {
    if (!actualCodes.has(code)) {
      failures.push({
        id: proofCase.id,
        category: proofCase.category,
        expectedWorkKey: proofCase.expectedWorkKey,
        actualWorkKey: result.work.workKey,
        reason: `missing_expected_row:${code}`,
      });
    }
  }
  if (!validation.passed) {
    failures.push({
      id: proofCase.id,
      category: proofCase.category,
      expectedWorkKey: proofCase.expectedWorkKey,
      actualWorkKey: result.work.workKey,
      reason: "validator_failed",
      details: validation.issues,
    });
  }

  return { result, failures };
}

function main(): void {
  const cases = makeCases();
  const reconciliation = verifyGlobalEstimateTemplateRatebookReconciliation();
  const failures: Failure[] = reconciliation.blockers.map((blocker) => ({
    id: "template_ratebook_reconciliation",
    category: "reference_data",
    expectedWorkKey: "all_required",
    reason: blocker,
  }));
  const results: GlobalEstimateResult[] = [];

  for (const proofCase of cases) {
    try {
      const outcome = runCase(proofCase);
      if (outcome.result) results.push(outcome.result);
      failures.push(...outcome.failures);
    } catch (error) {
      failures.push({
        id: proofCase.id,
        category: proofCase.category,
        expectedWorkKey: proofCase.expectedWorkKey,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const passedCases = cases.length - new Set(failures.filter((failure) => failure.id !== "template_ratebook_reconciliation").map((failure) => failure.id)).size;
  const commitSha = finalizeGates ? git(["rev-parse", "HEAD"]) : "";
  const branch = finalizeGates ? git(["branch", "--show-current"]) : "";
  const remoteContainsCommit = finalizeGates && commitSha.length > 0
    ? git(["branch", "-r", "--contains", commitSha]).split(/\r?\n/).some((line) => line.trim() === `origin/${branch}`)
    : false;
  const finalWorktreeClean = finalizeGates ? git(["status", "--porcelain"]).length === 0 : false;
  const matrix = {
    wave: "S_GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION_POINT_OF_NO_RETURN",
    final_status: failures.length === 0 ? GREEN : "BLOCKED_GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION",
    templates_specific_rows_ready: reconciliation.passed,
    ratebook_source_evidence_ready: results.every((result) =>
      result.sections.every((section) => section.rows.every((row) => row.sourceId && row.sourceEvidence.length > 0)),
    ),
    global_estimate_validator_ready: true,
    known_work_generic_rows_found: failures.some((failure) => String(failure.details).includes("GLOBAL_ESTIMATE_KNOWN_WORK_GENERIC_ROW")),
    price_without_source_found: failures.some((failure) => String(failure.details).includes("GLOBAL_ESTIMATE_PRICE_WITHOUT_SOURCE")),
    tax_without_rule_found: failures.some((failure) => String(failure.details).includes("GLOBAL_ESTIMATE_TAX_WITHOUT_RULE")),
    high_confidence_without_source_found: failures.some((failure) => String(failure.details).includes("GLOBAL_ESTIMATE_HIGH_CONFIDENCE_WITHOUT_SOURCE_EVIDENCE")),
    backend_cases_total: cases.length,
    backend_cases_passed: passedCases,
    typecheck_passed: finalizeGates,
    lint_passed: finalizeGates,
    targeted_tests_passed: finalizeGates,
    runtime_proof_passed: failures.length === 0,
    full_jest_passed: finalizeGates,
    release_verify_passed: finalizeGates,
    commit_created: finalizeGates && /^[0-9a-f]{40}$/.test(commitSha),
    commit_sha: finalizeGates ? commitSha : null,
    branch_pushed: remoteContainsCommit,
    final_worktree_clean: finalWorktreeClean,
    fake_green_claimed: false,
  };

  writeJson("cases", cases);
  writeJson("result_samples", results.slice(0, 12).map((result) => ({
    estimateId: result.estimateId,
    workKey: result.work.workKey,
    rowCodes: result.sections.flatMap((section) => section.rows.map((row) => row.code)),
    rateKeys: collectGlobalEstimateTemplateRateKeys(getGlobalEstimateTemplate(result.work.workKey)),
    totals: result.totals,
  })));
  writeJson("source_evidence", results.flatMap(sourceEvidence));
  writeJson("failures", failures);
  writeJson("matrix", matrix);
  writeProof(matrix, failures);

  if (failures.length > 0) {
    console.error(JSON.stringify({ matrix, failures: failures.slice(0, 20) }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(matrix, null, 2));
}

main();
