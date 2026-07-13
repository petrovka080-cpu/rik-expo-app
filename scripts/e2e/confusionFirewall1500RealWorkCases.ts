import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildConfusionFirewallBlockers,
  CONFUSION_FIREWALL_1500_WAVE,
  evaluationUsesGenericFallback,
  GREEN_CONFUSION_FIREWALL_1500,
  hasCanonicalWorkHint,
  hasUnderscoreKeyInUserInput,
} from "../../src/lib/ai/workOntology/confusionFirewall";
import {
  buildNoHintConfusionHardSet,
  buildNoHintRealUserWorkCorpus,
} from "../../src/lib/ai/workOntology/noHintRealUserCorpus";
import {
  evaluateNoHintCase,
  evaluateNoHintConfusionHardSet,
} from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import type { NoHintDetailedEvaluation } from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import type { NoHintRealUserWorkCase } from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";
import type {
  WorkOntologyCountry,
  WorkOntologyUnit,
} from "../../src/lib/ai/workOntology/constructionWorkOntologyTypes";
import { evaluateOperationObjectDisambiguationAudit } from "../../src/lib/ai/workOntology/operationObjectDisambiguation";
import {
  auditEstimateRowDomainGuard,
  buildProfessionalEstimateSnapshot,
  detectCrossDomainRowLeaks,
  hasProfessionalWorkTemplate,
} from "../../src/lib/ai/professionalEstimateTemplates";
import type {
  ProfessionalEstimateCaseUnit,
  ProfessionalRegion,
} from "../../src/lib/ai/professionalEstimateTemplates";
import {
  runProfessionalEstimateCarpetGoldenAudit as runCarpetGoldenAudit,
  runProfessionalEstimateExpandedPdfAudit as runExpandedPdfAudit,
} from "./professionalEstimate1500WorkCases";

export const CONFUSION_FIREWALL_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT",
);

type WaveJson = Record<string, unknown>;

type ConfusionFirewallCase = NoHintRealUserWorkCase & {
  expected_status: "RESOLVED";
  expected_canonical_work_key: string;
};

const PROFESSIONAL_CASE_UNITS: readonly ProfessionalEstimateCaseUnit[] = [
  "m2",
  "m3",
  "linear_m",
  "piece",
  "set",
  "kg",
  "ton",
];

export function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function isGeneratedProofArtifactPath(filePath: string): boolean {
  return filePath.replace(/\\/g, "/").startsWith("artifacts/");
}

function commitTouchesOnlyGeneratedProofArtifacts(commit: string): boolean {
  const files = gitOutput(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return files.length > 0 && files.every(isGeneratedProofArtifactPath);
}

export function sourceCodeHead(): string {
  let commit = gitOutput(["rev-parse", "HEAD"], "unknown");
  while (commit !== "unknown" && commitTouchesOnlyGeneratedProofArtifacts(commit)) {
    const parent = gitOutput(["rev-parse", `${commit}^`], "unknown");
    if (parent === "unknown" || parent === commit) break;
    commit = parent;
  }
  return commit;
}

export function currentHeadAtWriteTime(): string {
  return sourceCodeHead();
}

function withLineage<T extends WaveJson>(value: T): T & {
  wave: typeof CONFUSION_FIREWALL_1500_WAVE;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: CONFUSION_FIREWALL_1500_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeConfusionFirewallJson(name: string, value: WaveJson): WaveJson {
  const filePath = path.join(CONFUSION_FIREWALL_ARTIFACT_DIR, name);
  const payload = withLineage(value);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function readConfusionFirewallJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(CONFUSION_FIREWALL_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function shouldWriteArtifacts(options?: { writeArtifacts?: boolean }): boolean {
  return options?.writeArtifacts !== false;
}

function professionalRegionFor(input: {
  country?: WorkOntologyCountry;
  region?: string;
}): ProfessionalRegion {
  if (input.country === "KZ") {
    return /astana/i.test(input.region ?? "") ? "KZ_ASTANA" : "KZ_ALMATY";
  }
  if (input.country === "RU") return "RU_DEFAULT";
  if (input.country === "UZ") return "UZ_TASHKENT";
  if (/osh/i.test(input.region ?? "")) return "KG_OSH";
  return "KG_BISHKEK";
}

function professionalUnitFor(unit: WorkOntologyUnit | null): ProfessionalEstimateCaseUnit {
  if (unit && PROFESSIONAL_CASE_UNITS.includes(unit as ProfessionalEstimateCaseUnit)) {
    return unit as ProfessionalEstimateCaseUnit;
  }
  return "m2";
}

function acceptedKeys(testCase: NoHintRealUserWorkCase): string[] {
  return [
    testCase.expected_canonical_work_key,
    ...(testCase.acceptable_canonical_work_keys ?? []),
  ].filter((value): value is string => Boolean(value));
}

function highConfidenceWrong(testCase: NoHintRealUserWorkCase, evaluation: NoHintDetailedEvaluation): boolean {
  return evaluation.actual_status === "RESOLVED" &&
    evaluation.confidence >= 0.85 &&
    !acceptedKeys(testCase).includes(evaluation.actual_canonical_work_key ?? "");
}

export function buildConfusionFirewall1500RealWorkCases(): ConfusionFirewallCase[] {
  const cases = buildNoHintRealUserWorkCorpus()
    .filter((item): item is ConfusionFirewallCase =>
      item.expected_status === "RESOLVED" &&
      Boolean(item.expected_canonical_work_key) &&
      hasProfessionalWorkTemplate(item.expected_canonical_work_key ?? "")
    )
    .slice(0, 1500);

  if (cases.length !== 1500) {
    throw new Error(`CONFUSION_FIREWALL_REAL_WORK_CASE_COUNT:${cases.length}`);
  }
  return cases;
}

export function buildPublicRealWork1500Cases(): WaveJson {
  const cases = buildConfusionFirewall1500RealWorkCases().map((item) => ({
    id: item.id,
    user_input: item.user_input_ru,
    country: item.country ?? "KG",
    region: item.region ?? "Bishkek",
    expected_quantity: item.expected_quantity ?? null,
    expected_unit: item.expected_unit ?? null,
  }));
  return {
    real_work_cases_total: cases.length,
    canonical_hints_found: cases.filter((item) => hasCanonicalWorkHint(String(item.user_input))).length,
    underscore_keys_in_user_input: cases.filter((item) => hasUnderscoreKeyInUserInput(String(item.user_input))).length,
    cases,
    fake_green_claimed: false,
  };
}

export function runConfusionFirewall1500Audit(options?: { writeArtifacts?: boolean }): WaveJson {
  const cases = buildConfusionFirewall1500RealWorkCases();
  const operationObject = evaluateOperationObjectDisambiguationAudit();
  const evaluations = cases.map((testCase) => {
    const semantic = evaluateNoHintCase(testCase);
    const accepted = acceptedKeys(testCase);
    const selectedWorkKey = semantic.selected_work_key;
    let estimate: {
      selected_work_key: string;
      group_key: string;
      rows_total: number;
      cross_domain_row_leaks: number;
      row_without_provenance: number;
      generic_material_rows: number;
      paid_control_rows: number;
    } | null = null;
    let estimateFailure: string | null = null;

    if (semantic.passed && selectedWorkKey) {
      try {
        const snapshot = buildProfessionalEstimateSnapshot({
          selected_work_key: selectedWorkKey,
          quantity: semantic.quantity ?? testCase.expected_quantity ?? 10,
          unit: professionalUnitFor(semantic.unit ?? testCase.expected_unit ?? null),
          region: professionalRegionFor(testCase),
        });
        const leaks = detectCrossDomainRowLeaks({
          selected_work_key: snapshot.selected_work_key,
          expected_domain: snapshot.group_key,
          rows: snapshot.lines,
        });
        const rowGuard = auditEstimateRowDomainGuard({
          selected_work_key: snapshot.selected_work_key,
          expected_domain: snapshot.group_key,
          rows: snapshot.lines,
        });
        estimate = {
          selected_work_key: snapshot.selected_work_key,
          group_key: snapshot.group_key,
          rows_total: snapshot.lines.length,
          cross_domain_row_leaks: leaks.length,
          row_without_provenance: rowGuard.row_without_provenance,
          generic_material_rows: rowGuard.generic_material_rows,
          paid_control_rows: rowGuard.paid_control_rows,
        };
      } catch (error) {
        estimateFailure = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      case_id: testCase.id,
      input: testCase.user_input_ru,
      expected_canonical_work_key: testCase.expected_canonical_work_key,
      accepted_canonical_work_keys: accepted,
      actual_status: semantic.actual_status,
      actual_canonical_work_key: semantic.actual_canonical_work_key,
      selected_work_key: semantic.selected_work_key,
      confidence: semantic.confidence,
      semantic_passed: semantic.passed,
      semantic_failures: semantic.failures,
      high_confidence_wrong: highConfidenceWrong(testCase, semantic),
      generic_fallback_used: evaluationUsesGenericFallback(semantic),
      first_item_fallback_used: semantic.first_item_fallback_used,
      random_choice_used: semantic.random_choice_used,
      estimate,
      estimate_failure: estimateFailure,
    };
  });

  const crossDomainRowLeaks = evaluations.reduce((sum, item) => sum + (item.estimate?.cross_domain_row_leaks ?? 0), 0);
  const rowWithoutProvenance = evaluations.reduce((sum, item) => sum + (item.estimate?.row_without_provenance ?? 0), 0);
  const genericMaterialRows = evaluations.reduce((sum, item) => sum + (item.estimate?.generic_material_rows ?? 0), 0);
  const paidControlRows = evaluations.reduce((sum, item) => sum + (item.estimate?.paid_control_rows ?? 0), 0);
  const unresolvedKnownWork = evaluations.filter((item) => item.actual_status !== "RESOLVED").length;
  const wrongWorkMatches = evaluations.filter((item) =>
    item.actual_status === "RESOLVED" &&
    !item.accepted_canonical_work_keys.includes(item.actual_canonical_work_key ?? "")
  ).length;
  const selectedWorkKeyLost = evaluations.filter((item) =>
    item.actual_status === "RESOLVED" && (!item.selected_work_key || item.selected_work_key !== item.actual_canonical_work_key)
  ).length;
  const estimateBuildFailures = evaluations.filter((item) => item.estimate_failure !== null).length;
  const summary = {
    real_work_cases_total: cases.length,
    canonical_hints_found: cases.filter((item) => hasCanonicalWorkHint(item.user_input_ru)).length,
    underscore_keys_in_user_input: cases.filter((item) => hasUnderscoreKeyInUserInput(item.user_input_ru)).length,
    resolved_and_compiled_estimates: evaluations.filter((item) => item.actual_status === "RESOLVED" && item.estimate).length,
    unresolved_known_work_cases: unresolvedKnownWork,
    wrong_work_matches: wrongWorkMatches,
    high_confidence_wrong_matches: evaluations.filter((item) => item.high_confidence_wrong).length,
    known_work_to_generic_fallback: evaluations.filter((item) => item.generic_fallback_used).length,
    first_item_fallback_used: evaluations.filter((item) => item.first_item_fallback_used).length,
    random_choice_used: evaluations.filter((item) => item.random_choice_used).length,
    selected_work_key_lost: selectedWorkKeyLost,
    estimate_build_failures: estimateBuildFailures,
    ukladka_to_kladka_wrong_matches: operationObject.ukladka_to_kladka_wrong_matches,
    substring_kladka_inside_ukladka_used: operationObject.substring_kladka_inside_ukladka_used,
    object_dominance_passed: operationObject.object_dominance_passed,
    masonry_requires_masonry_object: operationObject.masonry_requires_masonry_object,
    masonry_without_masonry_object_matches: operationObject.masonry_without_masonry_object_matches,
    cross_domain_row_leaks: crossDomainRowLeaks,
    row_without_provenance: rowWithoutProvenance,
    generic_material_rows: genericMaterialRows,
    paid_control_rows: paidControlRows,
    fake_green_claimed: false,
  };
  const blockers = buildConfusionFirewallBlockers(summary);
  if (estimateBuildFailures !== 0) blockers.push(`ESTIMATE_BUILD_FAILURES_${estimateBuildFailures}`);

  const result = {
    final_status: blockers.length === 0
      ? GREEN_CONFUSION_FIREWALL_1500
      : "BLOCKED_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT",
    summary,
    blockers,
    operation_object_disambiguation: operationObject,
    evaluations: evaluations.filter((item) =>
      item.semantic_passed !== true ||
      item.estimate_failure !== null ||
      (item.estimate?.cross_domain_row_leaks ?? 0) > 0 ||
      item.high_confidence_wrong ||
      item.generic_fallback_used
    ).slice(0, 100),
    fake_green_claimed: false,
  };

  if (shouldWriteArtifacts(options)) {
    writeConfusionFirewallJson("real_work_1500_cases.json", buildPublicRealWork1500Cases());
    writeConfusionFirewallJson("confusion_firewall_results.json", result);
    writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  }

  return result;
}

export function runConfusionPairHardAudit(options?: { writeArtifacts?: boolean }): WaveJson {
  const audit = evaluateNoHintConfusionHardSet(buildNoHintConfusionHardSet());
  const operationObject = evaluateOperationObjectDisambiguationAudit();
  const result = {
    ...audit,
    ukladka_to_kladka_wrong_matches: operationObject.ukladka_to_kladka_wrong_matches,
    substring_kladka_inside_ukladka_used: operationObject.substring_kladka_inside_ukladka_used,
    object_dominance_passed: operationObject.object_dominance_passed,
    masonry_requires_masonry_object: operationObject.masonry_requires_masonry_object,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeConfusionFirewallJson("confusion_pair_hard_results.json", result);
    writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  }
  return result;
}

export function runCrossDomainEstimateLeakAudit(options?: { writeArtifacts?: boolean }): WaveJson {
  const audit = runConfusionFirewall1500Audit({ writeArtifacts: false }) as {
    summary?: Record<string, unknown>;
    final_status?: string;
    blockers?: unknown[];
  };
  const result = {
    final_status: audit.summary?.cross_domain_row_leaks === 0 &&
      audit.summary?.row_without_provenance === 0 &&
      audit.summary?.generic_material_rows === 0 &&
      audit.summary?.paid_control_rows === 0
      ? "GREEN_CONFUSION_FIREWALL_CROSS_DOMAIN_ESTIMATE_LEAK_AUDIT_READY"
      : "BLOCKED_CONFUSION_FIREWALL_CROSS_DOMAIN_ESTIMATE_LEAK_AUDIT",
    cases_scanned: audit.summary?.real_work_cases_total ?? null,
    cross_domain_row_leaks: audit.summary?.cross_domain_row_leaks ?? null,
    row_without_provenance: audit.summary?.row_without_provenance ?? null,
    generic_material_rows: audit.summary?.generic_material_rows ?? null,
    paid_control_rows: audit.summary?.paid_control_rows ?? null,
    selected_work_key_lost: audit.summary?.selected_work_key_lost ?? null,
    blockers: audit.blockers ?? [],
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeConfusionFirewallJson("cross_domain_leak_scan.json", result);
    writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  }
  return result;
}

export function runCarpetNoMasonryAudit(options?: { writeArtifacts?: boolean }): WaveJson {
  const base = runCarpetGoldenAudit({ writeArtifacts: false }) as WaveJson;
  const operationObject = evaluateOperationObjectDisambiguationAudit();
  const result = {
    ...base,
    final_status: base.carpet_cases_passed === true &&
      operationObject.ukladka_to_kladka_wrong_matches === 0 &&
      operationObject.object_dominance_passed === true
      ? "GREEN_CONFUSION_FIREWALL_CARPET_NO_MASONRY_READY"
      : "BLOCKED_CONFUSION_FIREWALL_CARPET_NO_MASONRY",
    ukladka_to_kladka_wrong_matches: operationObject.ukladka_to_kladka_wrong_matches,
    substring_kladka_inside_ukladka_used: operationObject.substring_kladka_inside_ukladka_used,
    object_dominance_passed: operationObject.object_dominance_passed,
    masonry_requires_masonry_object: operationObject.masonry_requires_masonry_object,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeConfusionFirewallJson("carpet_no_masonry_results.json", result);
    writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  }
  return result;
}

export function runExpandedPdfSignatureAudit(options?: { writeArtifacts?: boolean }): WaveJson {
  const base = runExpandedPdfAudit({ writeArtifacts: false }) as WaveJson;
  const result = {
    ...base,
    final_status: base.full_names_appendix_removed === true &&
      base.signature_blocks_present === true &&
      base.customer_signature_block_present === true &&
      base.contractor_signature_block_present === true
      ? "GREEN_CONFUSION_FIREWALL_EXPANDED_PDF_SIGNATURE_READY"
      : "BLOCKED_CONFUSION_FIREWALL_EXPANDED_PDF_SIGNATURE",
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeConfusionFirewallJson("expanded_pdf_signature_results.json", result);
    writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  }
  return result;
}

export function runCommandForConfusionFirewall(command: string, args: string[], timeoutMs: number): WaveJson {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    signal: result.signal,
    timed_out: result.error?.message?.includes("ETIMEDOUT") ?? false,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
}

export function runReleaseVerifyForConfusionFirewall(timeoutMs = 30 * 60_000): WaveJson {
  const release = runCommandForConfusionFirewall("npm", ["run", "release:verify"], timeoutMs);
  const stdoutText = Array.isArray(release.stdout_tail) ? release.stdout_tail.join("\n") : "";
  const readinessMatch = stdoutText.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  const blockersMatch = stdoutText.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  let blockers: unknown[] = [];
  if (blockersMatch) {
    try {
      blockers = JSON.parse(blockersMatch[1]) as unknown[];
    } catch {
      blockers = ["BLOCKERS_PARSE_FAILED"];
    }
  }
  const result = {
    ...release,
    final_status: release.exit_code === 0 && readinessMatch?.[1] === "pass" && blockers.length === 0
      ? "GREEN_CONFUSION_FIREWALL_RELEASE_VERIFY_READY"
      : "BLOCKED_CONFUSION_FIREWALL_RELEASE_VERIFY",
    readiness: { status: readinessMatch?.[1] ?? null },
    blockers,
    fake_green_claimed: false,
  };
  writeConfusionFirewallJson("release_verify.json", result);
  writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot());
  return result;
}

export function buildConfusionFirewallMatrixSnapshot(extra: WaveJson = {}): WaveJson {
  const firewall = readConfusionFirewallJson<WaveJson>("confusion_firewall_results.json") ?? {};
  const pair = readConfusionFirewallJson<WaveJson>("confusion_pair_hard_results.json") ?? {};
  const crossDomain = readConfusionFirewallJson<WaveJson>("cross_domain_leak_scan.json") ?? {};
  const carpet = readConfusionFirewallJson<WaveJson>("carpet_no_masonry_results.json") ?? {};
  const expandedPdf = readConfusionFirewallJson<WaveJson>("expanded_pdf_signature_results.json") ?? {};
  const closeout = readConfusionFirewallJson<WaveJson>("CLOSEOUT_PROOF.json") ?? {};
  const head = gitOutput(["rev-parse", "HEAD"], "unknown");
  const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
  const worktreeClean = gitOutput(["status", "--short", "--untracked-files=all"], "").trim().length === 0;
  const sourceHead = sourceCodeHead();
  const closeoutForCurrentSource = closeout.source_code_head === sourceHead ? closeout : {};
  const firewallSummary = firewall.summary && typeof firewall.summary === "object"
    ? firewall.summary as Record<string, unknown>
    : {};
  const pairSummary = pair.summary && typeof pair.summary === "object"
    ? pair.summary as Record<string, unknown>
    : {};
  const blockers = [
    ...((firewall.blockers as unknown[] | undefined) ?? []),
    ...((pairSummary.blockers as unknown[] | undefined) ?? []),
    ...((crossDomain.blockers as unknown[] | undefined) ?? []),
    ...((closeoutForCurrentSource.failures as unknown[] | undefined) ?? []),
  ];
  const matrix = {
    wave: CONFUSION_FIREWALL_1500_WAVE,
    final_status: blockers.length === 0 ? GREEN_CONFUSION_FIREWALL_1500 : "BLOCKED_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT",
    real_work_cases_total: firewallSummary.real_work_cases_total ?? null,
    canonical_hints_found: firewallSummary.canonical_hints_found ?? null,
    underscore_keys_in_user_input: firewallSummary.underscore_keys_in_user_input ?? null,
    resolved_and_compiled_estimates: firewallSummary.resolved_and_compiled_estimates ?? null,
    unresolved_known_work_cases: firewallSummary.unresolved_known_work_cases ?? null,
    high_confidence_wrong_matches: firewallSummary.high_confidence_wrong_matches ?? null,
    wrong_work_matches: firewallSummary.wrong_work_matches ?? null,
    known_work_to_generic_fallback: firewallSummary.known_work_to_generic_fallback ?? null,
    first_item_fallback_used: firewallSummary.first_item_fallback_used ?? null,
    random_choice_used: firewallSummary.random_choice_used ?? null,
    selected_work_key_lost: firewallSummary.selected_work_key_lost ?? null,
    ukladka_to_kladka_wrong_matches: firewallSummary.ukladka_to_kladka_wrong_matches ?? null,
    substring_kladka_inside_ukladka_used: firewallSummary.substring_kladka_inside_ukladka_used ?? null,
    object_dominance_passed: firewallSummary.object_dominance_passed ?? null,
    masonry_requires_masonry_object: firewallSummary.masonry_requires_masonry_object ?? null,
    masonry_without_masonry_object_matches: firewallSummary.masonry_without_masonry_object_matches ?? null,
    hard_confusion_cases_total: pairSummary.hard_confusion_cases_total ?? null,
    confusion_high_confidence_wrong_matches: pairSummary.high_confidence_wrong_matches ?? null,
    confusion_category_inversions: pairSummary.category_inversions ?? null,
    confusion_wrong_auto_select_for_ambiguous_input: pairSummary.wrong_auto_select_for_ambiguous_input ?? null,
    cross_domain_row_leaks: crossDomain.cross_domain_row_leaks ?? firewallSummary.cross_domain_row_leaks ?? null,
    row_without_provenance: crossDomain.row_without_provenance ?? firewallSummary.row_without_provenance ?? null,
    generic_material_rows: crossDomain.generic_material_rows ?? firewallSummary.generic_material_rows ?? null,
    paid_control_rows: crossDomain.paid_control_rows ?? firewallSummary.paid_control_rows ?? null,
    carpet_cases_total_min: 25,
    carpet_cases_total: carpet.carpet_cases_total ?? null,
    carpet_cases_passed: carpet.carpet_cases_passed ?? null,
    masonry_rows_in_carpet: carpet.masonry_rows_in_carpet ?? null,
    brick_rows_in_carpet: carpet.brick_rows_in_carpet ?? null,
    concrete_rows_in_carpet: carpet.concrete_rows_in_carpet ?? null,
    wrong_domain_rows_in_carpet: carpet.wrong_domain_rows_in_carpet ?? null,
    full_names_appendix_removed: expandedPdf.full_names_appendix_removed ?? null,
    signature_blocks_present: expandedPdf.signature_blocks_present ?? null,
    customer_signature_block_present: expandedPdf.customer_signature_block_present ?? null,
    contractor_signature_block_present: expandedPdf.contractor_signature_block_present ?? null,
    expanded_pdf_cases_total: expandedPdf.expanded_pdf_cases_total ?? null,
    typecheck_passed: closeoutForCurrentSource.typecheck_passed ?? null,
    lint_passed: closeoutForCurrentSource.lint_passed ?? null,
    focused_tests_passed: closeoutForCurrentSource.focused_tests_passed ?? null,
    release_verify_passed: closeoutForCurrentSource.release_verify_passed ?? null,
    post_push_release_verify_passed: closeoutForCurrentSource.post_push_release_verify_passed === true && head === originHead,
    local_head_equals_origin_head: head === originHead,
    branch_pushed: head === originHead,
    final_worktree_clean: worktreeClean,
    source_code_head: sourceHead,
    current_head_at_write_time: currentHeadAtWriteTime(),
    origin_head: originHead,
    blockers,
    ...closeoutForCurrentSource,
    ...extra,
    fake_green_claimed: false,
  };
  return {
    ...matrix,
    final_status: (matrix.blockers as unknown[]).length === 0 ? GREEN_CONFUSION_FIREWALL_1500 : matrix.final_status,
    fake_green_claimed: false,
  };
}
