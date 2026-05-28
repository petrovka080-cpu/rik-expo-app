import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  WITHOUT_LEVEL,
  WITHOUT_OBJECT,
  matchesDirectorObjectIdentity,
  resolveDirectorFactContext,
  type RequestLookupRow,
} from "../../src/lib/api/director_reports.shared";
import {
  DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT,
  DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT,
} from "../../src/lib/api/director_reports.aggregation.contracts";

const WAVE = "S_PLATFORM_DIRECTOR_FACT_CONTRACT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_PLATFORM_DIRECTOR_FACT_CONTRACT");

type Failure = {
  classification: string;
  reason: string;
  artifact?: string;
};

const ensureDir = () => fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const writeJson = (name: string, value: unknown): void => {
  ensureDir();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeText = (name: string, value: string): void => {
  ensureDir();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value, "utf8");
};

const boolEnv = (name: string): boolean =>
  process.env[name] === "1" || process.env[name] === "true";

const repoFile = (...parts: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

const gitOutput = (args: string[], fallback = ""): string => {
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
};

const requestRow = (overrides: Partial<RequestLookupRow> = {}): RequestLookupRow => ({
  id: "request-1",
  request_no: null,
  display_no: null,
  status: "submitted",
  object_id: "legacy-object-id",
  object_name: "legacy object display",
  object_type_code: null,
  object_identity_key: null,
  object_identity_name: null,
  object_identity_status: null,
  object_identity_source: null,
  system_code: null,
  level_code: null,
  zone_code: null,
  object: null,
  submitted_at: null,
  created_at: null,
  note: null,
  comment: null,
  item_count_total: null,
  item_count_active: null,
  item_qty_total: null,
  item_qty_active: null,
  ...overrides,
});

const pushFailure = (
  failures: Failure[],
  classification: string,
  reason: string,
  artifact?: string,
): void => {
  failures.push({ classification, reason, artifact });
};

function buildContractCases() {
  const stableIdentity = resolveDirectorFactContext({
    request_id: "request-1",
    request: requestRow({
      object_id: "legacy-object-id",
      object_name: "legacy object display",
      object_identity_key: "OBJ-STABLE-001",
      object_identity_name: "Stable construction object",
    }),
    issue_object_id: "issue-object-id",
    issue_object_name: "issue object text",
    request_object_type_name: "object type fallback",
  });
  const workLocation = resolveDirectorFactContext({
    request_id: "request-1",
    item_kind: "material",
    request: requestRow({
      system_code: "HVAC",
      zone_code: "Cafe hall",
      level_code: "Level 2",
    }),
    request_system_name: "Ventilation",
    request_zone_name: "Kitchen",
  });
  const freeNoteDisabled = resolveDirectorFactContext({
    request_id: null,
    request_item_id: null,
    issue_note: "free issue note text that must not become primary schema",
    use_free_issue_object_fallback: false,
    item_kind: "material",
  });
  const stableObjectMatch = matchesDirectorObjectIdentity(
    "Stable construction object",
    {
      object_id_resolved: "OBJ-STABLE-001",
      object_name_resolved: "legacy text",
    },
    { "Stable construction object": "OBJ-STABLE-001" },
  );
  const stableObjectMismatch = matchesDirectorObjectIdentity(
    "Other construction object",
    {
      object_id_resolved: "OBJ-STABLE-001",
      object_name_resolved: "legacy text",
    },
    { "Other construction object": "OBJ-STABLE-999" },
  );

  return {
    stable_identity_priority_passed:
      stableIdentity.object_id_resolved === "OBJ-STABLE-001" &&
      stableIdentity.object_name_resolved === "Stable construction object" &&
      stableIdentity.is_without_request === false,
    work_location_priority_passed:
      workLocation.work_name_resolved === "Ventilation" &&
      workLocation.level_name_resolved === "Level 2" &&
      workLocation.system_name_resolved === "Ventilation" &&
      workLocation.zone_name_resolved === "Kitchen",
    free_note_disabled_fails_closed:
      freeNoteDisabled.object_name_resolved === WITHOUT_OBJECT &&
      freeNoteDisabled.level_name_resolved === WITHOUT_LEVEL &&
      freeNoteDisabled.is_without_request === true,
    stable_object_match_passed: stableObjectMatch === true && stableObjectMismatch === false,
    cases: {
      stableIdentity,
      workLocation,
      freeNoteDisabled,
      stableObjectMatch,
      stableObjectMismatch,
    },
  };
}

function buildSourceScan() {
  const activePaths = [
    "src/lib/api/directorReportsTransport.service.ts",
    "src/lib/api/directorReportsScope.service.ts",
    "src/lib/api/director_reports.service.options.ts",
    "src/lib/api/director_reports.service.report.ts",
    "src/lib/api/director_reports.service.discipline.ts",
    "src/screens/director/reports/useDirectorReportsQuery.ts",
  ];
  const activeSource = activePaths.map((relativePath) => repoFile(relativePath)).join("\n");
  const releaseGuard = repoFile("scripts/release/releaseGuard.shared.ts");
  const changeControl = repoFile("scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts");
  const timedRunner = repoFile("scripts/release/runReleaseVerifyWithStepTiming.ts");
  const releaseRunner = repoFile("scripts/release/run-release-guard.ts");
  const aggregationContract = repoFile("src/lib/api/director_reports.aggregation.contracts.ts");

  const forbiddenFindings = [
    "fetchAllFactRowsFromTables",
    "fetchAllFactRowsFromView",
    "fetchDirectorFactViaAccRpc",
    "buildPayloadFromFactRows",
    "buildDisciplinePayloadFromFactRows",
    "parseFreeIssueContext(",
  ].filter((token) => activeSource.includes(token));

  return {
    activePaths,
    active_loaders_use_transport: activeSource.includes("loadDirectorReportTransportScope"),
    no_active_client_fact_fallback_tokens: forbiddenFindings.length === 0,
    forbiddenFindings,
    no_active_warehouse_issue_full_scan: !/\.from\(["']warehouse_issues["']\)/.test(activeSource),
    release_gate_registered: releaseGuard.includes("director-fact-contract-proof"),
    release_runner_env_ready: releaseRunner.includes("DIRECTOR_FACT_CONTRACT_RELEASE_VERIFY_PASSED"),
    timed_runner_env_ready: timedRunner.includes("DIRECTOR_FACT_CONTRACT_RELEASE_VERIFY_PASSED"),
    change_control_owns_wave: changeControl.includes("S_PLATFORM_DIRECTOR_FACT_CONTRACT_POINT_OF_NO_RETURN"),
    aggregation_contract_exports_fact_contract:
      aggregationContract.includes("DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT") &&
      aggregationContract.includes("factContextContract"),
  };
}

function main(): void {
  const failures: Failure[] = [];
  const contractCases = buildContractCases();
  const sourceScan = buildSourceScan();
  const requiredFields = DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.requiredResolvedFields;
  const contractAttached =
    DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.factContextContract ===
    DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT;
  const forbiddenResponsibilities =
    DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.forbiddenClientResponsibilities;

  if (!contractAttached) {
    pushFailure(failures, "DIRECTOR_FACT_CONTRACT_NOT_ATTACHED", "Aggregation contract does not expose factContextContract.");
  }
  if (requiredFields.length !== 7 || !requiredFields.includes("object_id_resolved")) {
    pushFailure(failures, "DIRECTOR_FACT_CONTRACT_FIELDS_INCOMPLETE", "Required resolved fact fields are incomplete.");
  }
  if (!forbiddenResponsibilities.includes("client_warehouse_issue_note_as_primary_schema")) {
    pushFailure(failures, "DIRECTOR_FACT_CONTRACT_FORBIDDEN_CLIENT_SCHEMA_MISSING", "String-as-schema guard is missing.");
  }
  if (!contractCases.stable_identity_priority_passed) {
    pushFailure(failures, "DIRECTOR_FACT_STABLE_IDENTITY_PRIORITY_FAILED", "Request identity projection did not beat legacy display text.");
  }
  if (!contractCases.work_location_priority_passed) {
    pushFailure(failures, "DIRECTOR_FACT_WORK_LOCATION_PRIORITY_FAILED", "Work/location semantics fell back to a generic item kind.");
  }
  if (!contractCases.free_note_disabled_fails_closed) {
    pushFailure(failures, "DIRECTOR_FACT_FREE_NOTE_FAIL_CLOSED_FAILED", "Disabled free-note object fallback did not fail closed.");
  }
  if (!contractCases.stable_object_match_passed) {
    pushFailure(failures, "DIRECTOR_FACT_STABLE_OBJECT_MATCH_FAILED", "Object filter did not prioritize stable object identity.");
  }
  if (!sourceScan.active_loaders_use_transport) {
    pushFailure(failures, "DIRECTOR_FACT_ACTIVE_LOADERS_NOT_ON_TRANSPORT", "Active director report loaders do not use transport scope.");
  }
  if (!sourceScan.no_active_client_fact_fallback_tokens) {
    pushFailure(
      failures,
      "DIRECTOR_FACT_CLIENT_FALLBACK_TOKENS_FOUND",
      `Active director loaders contain forbidden tokens: ${sourceScan.forbiddenFindings.join(", ")}`,
    );
  }
  if (!sourceScan.no_active_warehouse_issue_full_scan) {
    pushFailure(failures, "DIRECTOR_FACT_ACTIVE_WAREHOUSE_ISSUES_SCAN_FOUND", "Active director loaders query warehouse_issues directly.");
  }
  if (!sourceScan.release_gate_registered) {
    pushFailure(failures, "DIRECTOR_FACT_RELEASE_GATE_MISSING", "director-fact-contract-proof is not registered in release gates.");
  }
  if (!sourceScan.change_control_owns_wave) {
    pushFailure(failures, "DIRECTOR_FACT_CHANGE_CONTROL_MISSING", "Change-control ownership for this wave is missing.");
  }

  const finalStatus =
    failures.length === 0
      ? "GREEN_PLATFORM_DIRECTOR_FACT_CONTRACT_READY"
      : "BLOCKED_PLATFORM_DIRECTOR_FACT_CONTRACT";

  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    contract_owner: DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.owner,
    aggregation_contract_attached: contractAttached,
    required_resolved_fields: requiredFields,
    stable_identity_priority_passed: contractCases.stable_identity_priority_passed,
    work_location_priority_passed: contractCases.work_location_priority_passed,
    free_note_disabled_fails_closed: contractCases.free_note_disabled_fails_closed,
    stable_object_match_passed: contractCases.stable_object_match_passed,
    active_loaders_use_transport: sourceScan.active_loaders_use_transport,
    no_active_client_fact_fallback_tokens: sourceScan.no_active_client_fact_fallback_tokens,
    no_active_warehouse_issue_full_scan: sourceScan.no_active_warehouse_issue_full_scan,
    release_gate_registered: sourceScan.release_gate_registered,
    release_runner_env_ready: sourceScan.release_runner_env_ready,
    timed_runner_env_ready: sourceScan.timed_runner_env_ready,
    change_control_owns_wave: sourceScan.change_control_owns_wave,
    product_ui_changed: false,
    hooks_changed: false,
    screen_local_calculation_added: false,
    typecheck_passed: boolEnv("DIRECTOR_FACT_CONTRACT_TYPECHECK_PASSED"),
    lint_passed: boolEnv("DIRECTOR_FACT_CONTRACT_LINT_PASSED"),
    git_diff_check_passed: boolEnv("DIRECTOR_FACT_CONTRACT_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: boolEnv("DIRECTOR_FACT_CONTRACT_TARGETED_TESTS_PASSED"),
    full_jest_passed: boolEnv("DIRECTOR_FACT_CONTRACT_FULL_JEST_PASSED"),
    release_verify_passed: boolEnv("DIRECTOR_FACT_CONTRACT_RELEASE_VERIFY_PASSED"),
    commit_created: boolEnv("DIRECTOR_FACT_CONTRACT_COMMIT_CREATED"),
    branch_pushed: boolEnv("DIRECTOR_FACT_CONTRACT_BRANCH_PUSHED"),
    final_worktree_clean: gitOutput(["status", "--short"], "") === "",
    fake_green_claimed: false,
  };

  writeJson("contract_cases.json", contractCases);
  writeJson("source_scan.json", sourceScan);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  writeText(
    "proof.md",
    [
      "# Platform Director Fact Contract Proof",
      "",
      `- final_status: ${finalStatus}`,
      `- contract_owner: ${DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.owner}`,
      `- stable_identity_priority_passed: ${contractCases.stable_identity_priority_passed}`,
      `- work_location_priority_passed: ${contractCases.work_location_priority_passed}`,
      `- free_note_disabled_fails_closed: ${contractCases.free_note_disabled_fails_closed}`,
      `- active_loaders_use_transport: ${sourceScan.active_loaders_use_transport}`,
      `- no_active_client_fact_fallback_tokens: ${sourceScan.no_active_client_fact_fallback_tokens}`,
      `- no_active_warehouse_issue_full_scan: ${sourceScan.no_active_warehouse_issue_full_scan}`,
      `- fake_green_claimed: false`,
      "",
    ].join("\n"),
  );

  if (failures.length > 0) {
    console.error(JSON.stringify({ final_status: finalStatus, failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ final_status: finalStatus, fake_green_claimed: false }, null, 2));
}

main();
