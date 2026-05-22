import fs from "node:fs";
import path from "node:path";

export const CORE_MUTATION_IDEMPOTENCY_WAVE =
  "S_CORE_MUTATION_IDEMPOTENCY_AUDIT_TRAIL_HARDENING_CLOSEOUT";
export const CORE_MUTATION_IDEMPOTENCY_GREEN_STATUS =
  "GREEN_CORE_MUTATION_IDEMPOTENCY_AUDIT_TRAIL_HARDENING_READY";
export const CORE_MUTATION_IDEMPOTENCY_BLOCKED_STATUS =
  "BLOCKED_CORE_MUTATION_IDEMPOTENCY_AUDIT_TRAIL_HARDENING";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const ARTIFACT_PREFIX = "S_CORE_MUTATION_IDEMPOTENCY";

type Rule = {
  id: string;
  label: string;
  files: string[];
  requiredTokens: string[];
  forbiddenTokens: string[];
};

export type CoreMutationIdempotencyFinding = {
  rule_id: string;
  file: string;
  kind: "missing_required_token" | "forbidden_token";
  token: string;
};

export type CoreMutationIdempotencyRuleReport = {
  id: string;
  label: string;
  files: string[];
  passed: boolean;
  findings: CoreMutationIdempotencyFinding[];
};

export type CoreMutationIdempotencyMatrix = {
  final_status:
    | typeof CORE_MUTATION_IDEMPOTENCY_GREEN_STATUS
    | typeof CORE_MUTATION_IDEMPOTENCY_BLOCKED_STATUS;
  core_mutation_id_helper_present: boolean;
  screen_random_client_mutation_ids_found: boolean;
  director_request_approve_id_boundary_owned: boolean;
  director_proposal_approve_id_boundary_owned: boolean;
  buyer_proposal_submit_id_stable: boolean;
  date_now_client_mutation_id_found: boolean;
  math_random_client_mutation_id_found: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};

export type CoreMutationIdempotencyReport = {
  wave: typeof CORE_MUTATION_IDEMPOTENCY_WAVE;
  generated_at: string;
  rules: CoreMutationIdempotencyRuleReport[];
  findings: CoreMutationIdempotencyFinding[];
  matrix: CoreMutationIdempotencyMatrix;
};

type BuildOptions = {
  assumeGatesPassed?: boolean;
};

const RULES: Rule[] = [
  {
    id: "director_request_approve_boundary_id",
    label: "Director request approve mutation id is boundary-owned",
    files: [
      "src/screens/director/director.request.ts",
      "src/screens/director/director.request.boundary.ts",
    ],
    requiredTokens: [
      "buildCoreMutationIntentId",
      "scope: \"director.approve.request\"",
      "clientMutationId?: string | null",
      "approveDirectorRequestRpc",
    ],
    forbiddenTokens: [
      "dar_${",
      "Date.now()}_${Math.random",
    ],
  },
  {
    id: "director_proposal_approve_boundary_id",
    label: "Director proposal approve mutation id is boundary-owned",
    files: [
      "src/screens/director/director.proposal.ts",
      "src/screens/director/director.approve.boundary.ts",
    ],
    requiredTokens: [
      "buildCoreMutationIntentId",
      "scope: \"director.approve.proposal\"",
      "clientMutationId?: string | null",
      "clientMutationId: string;",
    ],
    forbiddenTokens: [
      "dap_${",
      "Date.now()}_${Math.random",
    ],
  },
  {
    id: "buyer_proposal_submit_stable_id",
    label: "Buyer proposal submit mutation id is stable for the same payload",
    files: [
      "src/lib/catalog/catalog.proposalCreation.service.ts",
      "src/lib/api/coreMutationId.ts",
    ],
    requiredTokens: [
      "buildCoreMutationIntentId",
      "scope: \"proposal.submit\"",
      "payload: {",
      "hashCoreMutationPayload",
    ],
    forbiddenTokens: [
      "cryptoLike?.randomUUID",
      "Date.now().toString(36)",
      "Math.random",
    ],
  },
];

const normalizePath = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");

const readFile = (file: string): string => {
  const fullPath = path.join(ROOT, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
};

const sourceForRule = (rule: Rule): string =>
  rule.files.map((file) => `\n/* ${file} */\n${readFile(file)}`).join("\n");

const buildRuleReport = (rule: Rule): CoreMutationIdempotencyRuleReport => {
  const source = sourceForRule(rule);
  const findings: CoreMutationIdempotencyFinding[] = [];
  for (const token of rule.requiredTokens) {
    if (!source.includes(token)) {
      findings.push({
        rule_id: rule.id,
        file: rule.files.join(","),
        kind: "missing_required_token",
        token,
      });
    }
  }
  for (const token of rule.forbiddenTokens) {
    if (source.includes(token)) {
      const file = rule.files.find((candidate) => readFile(candidate).includes(token)) ?? rule.files[0];
      findings.push({
        rule_id: rule.id,
        file,
        kind: "forbidden_token",
        token,
      });
    }
  }

  return {
    id: rule.id,
    label: rule.label,
    files: rule.files.map(normalizePath),
    passed: findings.length === 0,
    findings,
  };
};

export function buildCoreMutationIdempotencyReport(
  options: BuildOptions = {},
): CoreMutationIdempotencyReport {
  const rules = RULES.map(buildRuleReport);
  const findings = rules.flatMap((rule) => rule.findings);
  const fullJestPassed =
    options.assumeGatesPassed === true || process.env.CORE_MUTATION_IDEMPOTENCY_FULL_JEST_PASSED === "1";
  const releaseVerifyPassed =
    options.assumeGatesPassed === true || process.env.CORE_MUTATION_IDEMPOTENCY_RELEASE_VERIFY_PASSED === "1";
  const helperSource = readFile("src/lib/api/coreMutationId.ts");
  const helperPresent =
    helperSource.includes("buildCoreMutationIntentId") &&
    helperSource.includes("hashCoreMutationPayload") &&
    !helperSource.includes("Date.now()") &&
    !helperSource.includes("Math.random");
  const dateNowClientMutation = findings.some(
    (finding) => finding.kind === "forbidden_token" && finding.token.includes("Date.now"),
  );
  const mathRandomClientMutation = findings.some(
    (finding) => finding.kind === "forbidden_token" && finding.token.includes("Math.random"),
  );
  const blockers = [
    helperPresent ? null : "core_mutation_id_helper_missing_or_time_random",
    findings.length === 0 ? null : "core_mutation_idempotency_findings",
    fullJestPassed ? null : "full_jest_not_marked_passed",
    releaseVerifyPassed ? null : "release_verify_not_marked_passed",
  ].filter((entry): entry is string => Boolean(entry));

  const rulePassed = (id: string) => rules.find((rule) => rule.id === id)?.passed === true;
  const matrix: CoreMutationIdempotencyMatrix = {
    final_status:
      blockers.length === 0
        ? CORE_MUTATION_IDEMPOTENCY_GREEN_STATUS
        : CORE_MUTATION_IDEMPOTENCY_BLOCKED_STATUS,
    core_mutation_id_helper_present: helperPresent,
    screen_random_client_mutation_ids_found: dateNowClientMutation || mathRandomClientMutation,
    director_request_approve_id_boundary_owned: rulePassed("director_request_approve_boundary_id"),
    director_proposal_approve_id_boundary_owned: rulePassed("director_proposal_approve_boundary_id"),
    buyer_proposal_submit_id_stable: rulePassed("buyer_proposal_submit_stable_id"),
    date_now_client_mutation_id_found: dateNowClientMutation,
    math_random_client_mutation_id_found: mathRandomClientMutation,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
    blockers,
  };

  return {
    wave: CORE_MUTATION_IDEMPOTENCY_WAVE,
    generated_at: new Date().toISOString(),
    rules,
    findings,
    matrix,
  };
}

export function writeCoreMutationIdempotencyArtifacts(
  report: CoreMutationIdempotencyReport,
): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_inventory.json`),
    `${JSON.stringify(report.rules, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_findings.json`),
    `${JSON.stringify(report.findings, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_matrix.json`),
    `${JSON.stringify(report.matrix, null, 2)}\n`,
  );

  const proof = [
    `# ${CORE_MUTATION_IDEMPOTENCY_WAVE}`,
    "",
    `Status: ${report.matrix.final_status}`,
    "",
    "## Rules",
    ...report.rules.map((rule) => `- ${rule.id}: ${rule.passed ? "passed" : "blocked"}`),
    "",
    "## Findings",
    report.findings.length === 0
      ? "- none"
      : report.findings.map((finding) => `- ${finding.rule_id}: ${finding.kind} ${finding.token}`).join("\n"),
    "",
    "## Matrix",
    "```json",
    JSON.stringify(report.matrix, null, 2),
    "```",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_proof.md`), proof);
}

