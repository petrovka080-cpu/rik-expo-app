import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { parseOwnedFiletimeControlR1, parseOwnedCompletedReceiptR1 } from "../verification/ownedControlFiletimeTransportR1";
import path from "node:path";
import { planFocusedTests, assertExactFocusedJestResults, type FocusedTestPlan } from "./focusedTestRouting";

import { classifyStagedCommitScope } from "./classifyStagedCommitScope";

type CommandResult = {
  command: string;
  args: string[];
  exit_code: number | null;
};

let ordinaryHookStageOrdinal = 0;

function ordinaryHookProfile(): { path: string; sha256: string; input: { commandRole: string; sourceFreeze: string; referenceInputPins: Array<{path: string; sha256: string}>; hook: {contract: string; rootThreadId: string; instanceNonce: string; absoluteEndUtc: string; focusedPlanSha256: string; dbCommands: Array<{path: string; sha256: string}>; pythonExecutable: string; governorPath: string; nodeExecutable: string; gitExecutable: string; npmCli: string; npxCli: string; stages: Array<{command: string; args: string[]; nativeArgv: string[]}>} } } | undefined {
  const file = process.env.GOX_HOOK_COORDINATOR_COMMAND;
  const digest = process.env.GOX_HOOK_COORDINATOR_COMMAND_SHA256;
  if (!file && !digest) return undefined;
  if (process.platform !== "win32" || !file || !path.isAbsolute(file) || !digest || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("HOOK_COORDINATOR_EXPLICIT_INPUT_REQUIRED");
  const bytes = fs.readFileSync(file);
  if (createHash("sha256").update(bytes).digest("hex") !== digest) throw new Error("HOOK_COORDINATOR_COMMAND_PIN_DRIFT");
  const input = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
  if (input.commandRole !== "FINITE_HOOK_COORDINATOR" || input.hook?.contract !== "gox-finite-ordinary-hook/v1" ||
      input.hook.rootThreadId !== "01a1909a-16c4-78e0-958b-a6a44b666b52") throw new Error("HOOK_COORDINATOR_CONTRACT_REQUIRED");
  if (!Number.isFinite(Date.parse(input.hook.absoluteEndUtc)) || Date.now() >= Date.parse(input.hook.absoluteEndUtc) - 45000 ||
      fs.existsSync(path.join(path.dirname(file), "HOOK_STOP_REQUEST.json"))) throw new Error("HOOK_COORDINATOR_CLOSING");
  return {path: file, sha256: digest, input};
}

function ordinaryHookNativeArgv(command: string, args: string[], profile: ReturnType<typeof ordinaryHookProfile>): string[] {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    const cli = profile ? (command === "npm" ? profile.input.hook.npmCli : profile.input.hook.npxCli)
      : path.join(path.dirname(fs.realpathSync(process.execPath)), "node_modules", "npm", "bin", `${command}-cli.js`);
    if (!fs.existsSync(cli)) throw new Error(`PRECOMMIT_NATIVE_CLI_REQUIRED:${command}`);
    return [process.execPath, cli, ...args];
  }
  return [profile && command === "git" ? profile.input.hook.gitExecutable : command, ...args];
}

function run(command: string, args: string[], options: { allowFailure?: boolean } = {}): CommandResult {
  console.log(`[pre-commit:${command}] ${[command, ...args].join(" ")}`);
  const profile = ordinaryHookProfile();
  const nativeArgv = ordinaryHookNativeArgv(command, args, profile);
  let exitCode: number | null;
  if (profile) {
    const ordinal = ordinaryHookStageOrdinal++;
    const expected = profile.input.hook.stages[ordinal];
    if (!expected || expected.command !== command || JSON.stringify(expected.args) !== JSON.stringify(args) ||
        JSON.stringify(expected.nativeArgv) !== JSON.stringify(nativeArgv)) throw new Error("HOOK_FRESH_ORDERED_STAGE_PLAN_DRIFT");
    const root = path.dirname(profile.path);
    const stages = path.join(root, "stages");
    if (ordinal === 0) fs.mkdirSync(stages);
    const directory = path.join(stages, String(ordinal).padStart(3, "0"));
    fs.mkdirSync(directory);
    const commandPath = path.join(directory, "command.json");
    const stage = {
      commandRole: "FINITE_HOOK_STAGE", args: nativeArgv, expectedExit: 0, environment: {},
      policy: {admissionMiB:4096,osStopMiB:3072,rssMiB:3072,privateMiB:3584,timeoutSeconds:1200},
      sourceFreeze: profile.input.sourceFreeze, referenceInputPins: profile.input.referenceInputPins,
      hook: {contract:"gox-finite-ordinary-hook/v1",rootThreadId:profile.input.hook.rootThreadId,
        governorPath:profile.input.hook.governorPath,pythonExecutable:profile.input.hook.pythonExecutable,
        coordinatorCommandSha256:profile.sha256,coordinatorNonce:profile.input.hook.instanceNonce,
        stageOrdinal:ordinal,logicalCommand:command,logicalArgs:args},
    };
    fs.writeFileSync(commandPath, JSON.stringify(stage, null, 2) + "\n", {flag:"wx"});
    const result = spawnSync(profile.input.hook.pythonExecutable, ["-I","-B","-X","utf8",profile.input.hook.governorPath,commandPath], {
      cwd:process.cwd(),stdio:"inherit",shell:false,
    });
    if (result.status !== 0) throw new Error("HOOK_ACTUAL_GOVERNED_STAGE_FAILED");
    const receipt = JSON.parse(fs.readFileSync(path.join(directory,"receipt.json"),"utf8"));
    const actualSha = createHash("sha256").update(fs.readFileSync(commandPath)).digest("hex");
    if (receipt.status !== "EXPECTED_OUTCOME_AND_CLEAN_CLOSURE" || receipt.commandRole !== "FINITE_HOOK_STAGE" ||
        receipt.commandSha256 !== actualSha || receipt.exitCode !== 0 || !Array.isArray(receipt.remainingOwnedProcesses) || receipt.remainingOwnedProcesses.length !== 0) throw new Error("HOOK_FRESH_ACTUAL_STAGE_AND_CLOSURE_REQUIRED");
    ordinaryHookProfile(); // Recheck absolute deadline and immutable root after I/O.
    exitCode = receipt.exitCode;
  } else {
    const result = spawnSync(nativeArgv[0], nativeArgv.slice(1), {cwd:process.cwd(),stdio:"inherit",shell:false});
    exitCode = result.status;
  }
  if (exitCode !== 0 && !options.allowFailure) process.exit(exitCode ?? 1);
  return {command,args,exit_code:exitCode};
}

function ordinaryHookJestOutputDirectory(): string {
  const profile = ordinaryHookProfile();
  if (!profile) return fs.mkdtempSync(path.join(os.tmpdir(), "gox-focused-jest-"));
  const directory = path.join(path.dirname(profile.path), "jest-results");
  fs.mkdirSync(directory);
  return directory;
}

function stagedJsonFiles(files: string[]): string[] {
  return files.filter((file) => file.endsWith(".json") && fs.existsSync(file));
}

function validateJsonArtifacts(files: string[]): void {
  for (const file of stagedJsonFiles(files)) {
    JSON.parse(fs.readFileSync(file, "utf8"));
  }
}

function assertNoFakeGreenArtifacts(files: string[]): void {
  for (const file of files.filter((item) => item.startsWith("artifacts/") && fs.existsSync(item))) {
    const text = fs.readFileSync(file, "utf8");
    if (/fake_green_claimed"\s*:\s*true/i.test(text)) {
      throw new Error(`BLOCKED_FAKE_GREEN_ARTIFACT:${file}`);
    }
  }
}

const MAX_FOCUSED_JEST_FILES_PER_RUN = 25;

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function focusedJestArgs(stagedFiles: string[], plan: FocusedTestPlan): string[][] {
  const changedTests = plan.jestFiles;
  if (changedTests.length > 0) {
    return chunked(changedTests, MAX_FOCUSED_JEST_FILES_PER_RUN)
      .map((chunk) => ["test", "--", "--runInBand", "--runTestsByPath", ...chunk]);
  }
  if (stagedFiles.some((file) => file.startsWith("tests/releasePipeline/") || file.startsWith("scripts/release/"))) {
    return [["test", "--", "--runInBand", "tests/releasePipeline"]];
  }
  if (stagedFiles.some((file) => file.startsWith("scripts/e2e/androidApi34") || file.includes("AndroidApi34"))) {
    return [["test", "--", "--runInBand", "tests/releasePipeline"]];
  }
  if (stagedFiles.some((file) => file.startsWith("src/lib/officeRuntime") || file.startsWith("tests/officeAuth"))) {
    return [["test", "--", "--runInBand", "tests/officeAuth"]];
  }
  return [];
}

const LOCAL_DB_NORMAL_LOCKED_TESTS = [
  "scripts/estimate/r4a13/concreteCuringRegistryNormalLockedR145.test.ts",
  "scripts/estimate/r4a13/concreteCuringCurrentFormalNormalLockedR275.test.ts",
  "scripts/estimate/r4a13/facadeVentilatedSteelExistingNormalLockedR5.test.ts",
] as const;
const LOCAL_DB_ASPHALT_TESTS = [
  "tests/estimateNorms/asphaltCompactionS26PreparedDbDriven.contract.test.ts",
  "tests/estimateNorms/asphaltInstallS26PreparedDbDriven.contract.test.ts",
  "tests/estimateNorms/asphaltLevelS2716PreparedDbDriven.contract.test.ts",
] as const;
const LOCAL_DB_MASTER30_TESTS = ["tests/requestEstimate/master30CurrentPromptIngress.db.contract.test.ts"] as const;
const LOCAL_DB_GROUPS = ["NORMAL_LOCKED_THREE", "ASPHALT_PREPARED_THREE", "MASTER30_PROMPT_INGRESS_ONE"] as const;
type LocalDbFixedGroup = typeof LOCAL_DB_GROUPS[number];
const LOCAL_DB_SPECS = {
  NORMAL_LOCKED_THREE: { tests: LOCAL_DB_NORMAL_LOCKED_TESTS, variable: "GOX_DB_VERIFICATION_COMMAND", directory: "normal-locked-three" },
  ASPHALT_PREPARED_THREE: { tests: LOCAL_DB_ASPHALT_TESTS, variable: "GOX_DB_ASPHALT_COMMAND", directory: "asphalt-prepared-three" },
  MASTER30_PROMPT_INGRESS_ONE: { tests: LOCAL_DB_MASTER30_TESTS, variable: "GOX_DB_MASTER30_COMMAND", directory: "master30-prompt-ingress-one" },
} as const;
const LOCAL_DB_ALL_TESTS = [...LOCAL_DB_NORMAL_LOCKED_TESTS, ...LOCAL_DB_ASPHALT_TESTS, ...LOCAL_DB_MASTER30_TESTS];

function assertCompletedLocalDbReport(value: unknown): { passedSuites: number; pendingSuites: number; failedSuites: number; totalTests: number; passedTests: number; pendingTests: number; failedTests: number } {
  if (!value || typeof value !== "object") throw new Error("LOCAL_DB_RESULT_REQUIRED");
  const report = value as { success?: boolean; wasInterrupted?: boolean; numTotalTestSuites?: number; numPassedTestSuites?: number; numPendingTestSuites?: number; numFailedTestSuites?: number; numRuntimeErrorTestSuites?: number; numTotalTests?: number; numPassedTests?: number; numPendingTests?: number; numFailedTests?: number; numTodoTests?: number; testResults?: Array<{ status?: string; assertionResults?: Array<{ status?: string }> }> };
  if (report.success !== true || report.wasInterrupted !== false || report.numTotalTestSuites !== 1 || report.numPassedTestSuites !== 1 ||
      report.numPendingTestSuites !== 0 || report.numFailedTestSuites !== 0 || report.numRuntimeErrorTestSuites !== 0 ||
      report.numPendingTests !== 0 || report.numFailedTests !== 0 || report.numTodoTests !== 0 ||
      !Number.isInteger(report.numTotalTests) || !report.numTotalTests || report.numTotalTests < 1 || report.numPassedTests !== report.numTotalTests ||
      !Array.isArray(report.testResults) || report.testResults.length !== 1) throw new Error("LOCAL_DB_ALL_REAL_TESTS_COMPLETED_REQUIRED");
  const suite = report.testResults[0];
  if (suite.status !== "passed" || !Array.isArray(suite.assertionResults) || suite.assertionResults.length !== report.numTotalTests ||
      suite.assertionResults.some(assertion => assertion.status !== "passed")) throw new Error("LOCAL_DB_ALL_ASSERTION_RESULTS_PASSED_REQUIRED");
  return { passedSuites: report.numPassedTestSuites, pendingSuites: report.numPendingTestSuites, failedSuites: report.numFailedTestSuites,
    totalTests: report.numTotalTests, passedTests: report.numPassedTests, pendingTests: report.numPendingTests, failedTests: report.numFailedTests };
}

function assertCoordinatedDatabaseInventory(plan?: FocusedTestPlan): void {
  const profile = ordinaryHookProfile();
  if (!profile) return;
  const refs = profile.input.hook.dbCommands;
  if (!Array.isArray(refs) || refs.length !== 3) throw new Error("HOOK_EXACT_THREE_DB_COMMANDS_REQUIRED");
  const groups = new Set<string>(), paths = new Set<string>(), directories = new Set<string>(), nonces = new Set<string>(), digests = new Set<string>(), leases = new Set<string>();
  for (const ref of refs) {
    if (!path.isAbsolute(ref.path)) throw new Error("HOOK_ABSOLUTE_DB_COMMAND_REQUIRED");
    const bytes = fs.readFileSync(ref.path);
    if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new Error("HOOK_DB_INPUT_PIN_DRIFT");
    const command = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")), db = command.db;
    if (command.commandRole !== "FINITE_DB_VERIFICATION" || command.expectedExit !== 0 || db?.contract !== "gox-finite-db-fixed-groups/v3" ||
        db.rootThreadId !== profile.input.hook.rootThreadId || !(LOCAL_DB_GROUPS as readonly string[]).includes(db.group) ||
        path.resolve(db.governorPath).toLowerCase() !== path.resolve(profile.input.hook.governorPath).toLowerCase() ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(db.instanceNonce)) throw new Error("HOOK_DB_CONTRACT_REQUIRED");
    const key = path.resolve(ref.path).toLowerCase(), directory = path.dirname(key);
    if (groups.has(db.group) || paths.has(key) || directories.has(directory) || nonces.has(db.instanceNonce) || digests.has(ref.sha256)) throw new Error("HOOK_DB_DISTINCT_COMMAND_INSTANCES_REQUIRED");
    groups.add(db.group); paths.add(key); directories.add(directory); nonces.add(db.instanceNonce); digests.add(ref.sha256);
    leases.add(JSON.stringify([db.leaseStartUtc, db.leaseEndUtc, db.latestAllowedStartUtc]));
    const variable = LOCAL_DB_SPECS[db.group as LocalDbFixedGroup].variable;
    if (!process.env[variable] || path.resolve(process.env[variable]!).toLowerCase() !== key || process.env[`${variable}_SHA256`] !== ref.sha256) throw new Error("HOOK_UNLISTED_OR_DRIFTED_DB_ENV_COMMAND");
  }
  if (groups.size !== 3 || leases.size !== 1) throw new Error("HOOK_ALL_THREE_FIXED_GROUPS_ONE_ORIGINAL_LEASE_REQUIRED");
  if (plan) {
    const fixed = LOCAL_DB_ALL_TESTS;
    if (fixed.some(test => plan.jestFiles.filter(file => file === test).length !== 1)) throw new Error("HOOK_EXACT_SEVEN_DB_SUITES_ONCE_REQUIRED");
  }
  ordinaryHookProfile(); // Deadline and frozen command rechecked after inventory I/O.
}

function assertFixedLocalDbCapturePrelude(db: {group: string; capturePrelude?: unknown}): void {
  if (Object.hasOwn(db,'capturePrelude') && ((typeof db.capturePrelude !== 'string' || !['PANEL_SOCKET_CURRENT_INPUTS','MONOLITHIC_WALL_CURRENT_INPUTS','MONOLITHIC_WALL_NUMERIC_INVENTORY_ONLY','MONOLITHIC_WALL_COMPLETE_RAW_INPUTS_R2'].includes(db.capturePrelude)) || db.group !== 'NORMAL_LOCKED_THREE')) throw new Error('LOCAL_DB_FIXED_CAPTURE_PRELUDE_REQUIRED');
}

function runExplicitLocalDatabaseGroup(plan: FocusedTestPlan, group: LocalDbFixedGroup): FocusedTestPlan {
  assertCoordinatedDatabaseInventory();
  // Linux and unconfigured environments retain the ordinary real Jest route.
  const { tests, variable } = LOCAL_DB_SPECS[group];
  const commandPath = process.env[variable], commandSha256 = process.env[`${variable}_SHA256`];
  if (process.platform !== "win32" || (!commandPath && !commandSha256)) return plan;
  if (!commandPath || !path.isAbsolute(commandPath) || !commandSha256 || !/^[a-f0-9]{64}$/.test(commandSha256)) {
    throw new Error("LOCAL_DB_EXPLICIT_PINNED_COMMAND_REQUIRED");
  }
  const hash = (file: string): string => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (hash(commandPath) !== commandSha256) throw new Error("LOCAL_DB_COMMAND_HASH_DRIFT");
  const command = JSON.parse(fs.readFileSync(commandPath, "utf8").replace(/^\uFEFF/, ""));
  if (command.commandRole !== "FINITE_DB_VERIFICATION" || command.db?.contract !== "gox-finite-db-fixed-groups/v3" || command.db.group !== group ||
      command.db.rootThreadId !== "01a1909a-16c4-78e0-958b-a6a44b666b52" || command.expectedExit !== 0) {
    throw new Error("LOCAL_DB_COMMAND_CONTRACT_MISMATCH");
  }
  const db = command.db;
  assertFixedLocalDbCapturePrelude(db);
  const pin = (file: string): void => {
    if (typeof file !== "string" || !path.isAbsolute(file)) throw new Error("LOCAL_DB_ABSOLUTE_INPUT_REQUIRED");
    const matches = command.referenceInputPins.filter((entry: { path: string; sha256: string }) =>
      path.resolve(entry.path).toLowerCase() === path.resolve(file).toLowerCase());
    if (matches.length !== 1 || matches[0].sha256 !== hash(file)) throw new Error("LOCAL_DB_EXACT_INPUT_PIN_DRIFT");
  };
  for (const file of [db.governorPath, db.pythonExecutable, db.nodeExecutable,
    path.resolve("scripts/release/runScopedPreCommit.ts"), path.resolve("scripts/release/focusedTestRouting.ts"),
    path.resolve("scripts/dev/startWholeAppDeveloperReview.ps1"), path.resolve("scripts/verification/ownedControlFiletimeTransportR1.ts")]) pin(file);
  if (path.resolve(db.nodeExecutable).toLowerCase() !== path.resolve(process.execPath).toLowerCase() ||
      path.basename(db.governorPath) !== "run-owned-build-stage.py") throw new Error("LOCAL_DB_EXECUTABLE_IDENTITY");
  const intersection = plan.jestFiles.filter(file => (tests as readonly string[]).includes(file));
  // Literal groups have exactly3/3/1 suites; no command can supply a test list.
  if (intersection.length !== tests.length || new Set(intersection).size !== tests.length) throw new Error("LOCAL_DB_CONFIGURED_EXACT_LITERAL_GROUP_PLAN_REQUIRED");
  const stage = path.dirname(commandPath);
  for (const name of ["receipt.json", "jest-0.json", "jest-1.json", "jest-2.json"]) {
    if (fs.existsSync(path.join(stage, name))) throw new Error("LOCAL_DB_STALE_RESULT");
  }
  console.log(`[pre-commit] Running the ${tests.length} real ${group} suites in the explicit finite local DB window.`);
  const executed = spawnSync(db.pythonExecutable, ["-I", "-B", "-X", "utf8", db.governorPath, commandPath], {
    cwd: process.cwd(), stdio: "inherit", shell: false,
    env: { ...process.env, GOX_DB_HOOK_PID: String(process.pid) },
  });
  if (executed.status !== 0) throw new Error("LOCAL_DB_GOVERNOR_OR_REAL_JEST_FAILED");
  if (db.capturePrelude === "MONOLITHIC_WALL_NUMERIC_INVENTORY_ONLY") throw new Error("LOCAL_DB_NUMERIC_INVENTORY_IS_NOT_TEST_COVERAGE");
  if (hash(commandPath) !== commandSha256) throw new Error("LOCAL_DB_COMMAND_CHANGED_DURING_RUN");
  const receipt = JSON.parse(fs.readFileSync(path.join(stage, "receipt.json"), "utf8"));
  if (receipt.status !== "EXPECTED_OUTCOME_AND_CLEAN_CLOSURE" || receipt.commandRole !== "FINITE_DB_VERIFICATION" || receipt.fixedGroup !== group ||
      receipt.context?.commandSha256 !== commandSha256 || receipt.context?.instanceNonce !== db.instanceNonce ||
      receipt.testsPassed !== true || receipt.normalPgClosure !== true || receipt.pgStopExit !== 0 ||
      receipt.launcherExit !== 0 || !Array.isArray(receipt.remainingOwnedProcesses) || receipt.remainingOwnedProcesses.length !== 0) {
    throw new Error("LOCAL_DB_TEST_AND_CLOSURE_RECEIPT_REQUIRED");
  }
  if (Object.hasOwn(db,'capturePrelude')) {
    const rawWallMode=db.capturePrelude==='MONOLITHIC_WALL_COMPLETE_RAW_INPUTS_R2';
    const wallMode=db.capturePrelude==='MONOLITHIC_WALL_CURRENT_INPUTS';
    const directory=path.join(stage,rawWallMode?'monolithic-wall-complete-raw-inputs':wallMode?'monolithic-wall-current-inputs':'panel-socket-current-inputs');
    const capture=JSON.parse(fs.readFileSync(path.join(directory,'CAPTURE_MANIFEST.json'),'utf8'));
    const rawOwner=fs.readFileSync(path.join(stage,'DB_OWNER_CONTEXT.json'),'utf8');
    const owner=parseOwnedFiletimeControlR1(rawOwner);
    const pg=parseOwnedFiletimeControlR1(fs.readFileSync(path.join(stage,'DB_PG_OWNED.json'),'utf8'));
    const exactReceipt=parseOwnedCompletedReceiptR1(fs.readFileSync(path.join(stage,'receipt.json'),'utf8'),rawOwner);
    if (capture.contract !== (rawWallMode?'bound-monolithic-wall-complete-raw-witness/r2':wallMode?'bound-monolithic-wall-current-read-witness/r2':'bound-electrical-current-read-witness/r2') || capture.filetimeEncoding !== 'DECIMAL_UINT64_STRING' ||
        capture.commandSha256 !== commandSha256 || owner.commandSha256 !== commandSha256 || owner.commandPath !== commandPath ||
        !Number.isSafeInteger(owner.childPid) || owner.childPid <= 0 || typeof owner.childStartFiletime !== 'string' ||
        !Number.isSafeInteger(pg.postgres?.pid) || pg.postgres.pid <= 0 || typeof pg.postgres.startFiletime !== 'string' ||
        JSON.stringify(capture.context) !== JSON.stringify(owner) || JSON.stringify(pg.context) !== JSON.stringify(owner) ||
        JSON.stringify(exactReceipt.context) !== JSON.stringify(owner) ||
        JSON.stringify(capture.postgres) !== JSON.stringify(pg.postgres) || JSON.stringify(exactReceipt.postgres) !== JSON.stringify(pg.postgres) ||
        capture.context?.instanceNonce !== db.instanceNonce || capture.context?.rootThreadId !== db.rootThreadId ||
        capture.transaction?.rolledBack !== true || capture.transaction?.readOnly !== true || capture.transaction?.isolation !== 'repeatable read' ||
        capture.sourceAdmission !== false || capture.full !== false) throw new Error('LOCAL_DB_ACTUAL_CAPTURE_WITNESS_REQUIRED');
    if(wallMode||rawWallMode){
      const expected={"release_id":"01417cef-3091-5012-844d-1bbd9e75cee1","catalog_id":"canonical-work:master:monolithic_reinforced_concrete_wall_standard","definition_version_id":"17c7db90-0c2d-523b-a673-ae1b47ebfebc","approved_template_baseline_id":"4fbfec74-7195-50fc-9c72-5ace39c73f76","definition_hash":"64ca2993df836e098c5b316eb051637aee272ecff52c7ab306f9ffad122c4d67"};
      if(capture.scope!==(rawWallMode?'FIXED_MONOLITHIC_WALL_COMPLETE_RAW_NOT_ADMISSION':'FIXED_MONOLITHIC_WALL_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION')||capture.transaction?.timezone!=='UTC'||capture.projectAuthenticated!==false||
          capture.pointer?.definitionReleaseId!==expected.release_id||JSON.stringify(Object.keys(capture.outputs??{}))!==JSON.stringify(['wall'])||
          Object.keys(capture.expectedMembership??{}).length!==Object.keys(expected).length||
          Object.entries(expected).some(([key,value])=>capture.expectedMembership?.[key]!==value||capture.membership?.[key]!==value))throw new Error('LOCAL_DB_FIXED_WALL_MEMBERSHIP_REQUIRED');
      if(rawWallMode){
        const bytes=fs.readFileSync(path.join(directory,'wall-current-complete-raw-parent.json'));
        if(bytes.length>12*1024*1024)throw new Error('LOCAL_DB_FIXED_WALL_RAW_BODY_REQUIRED');
        const body=JSON.parse(bytes.toString('utf8'));
        const collections=['membership','definition','baseline','parameters','formulas','resources','bindings','normativeLocators','normativeSources','contentPassport','publicIdentity'];
        if(body.contract!=='fixed-wall-complete-raw-parent/r2'||body.readOnly!==true||body.sourceMetadataLosslessRoundtrip!==true||body.sourceAdmission!==false||body.normalLockedFullGuardSatisfied!==false||body.full!==false||capture.normalLockedFullGuardSatisfied!==false||
            JSON.stringify(Object.keys(body).sort())!==JSON.stringify(['contract','rawRows','rawRowsSha256','readOnly','sourceMetadataLosslessRoundtrip','sourceAdmission','normalLockedFullGuardSatisfied','full'].sort())||
            !body.rawRows||JSON.stringify(Object.keys(body.rawRows))!==JSON.stringify(collections)||
            collections.some(key=>!Array.isArray(body.rawRows[key])||body.rawRows[key].some((row:unknown)=>typeof row!=='string'))||
            body.rawRows.membership.length!==1||createHash('sha256').update(JSON.stringify(body.rawRows)).digest('hex')!==body.rawRowsSha256)throw new Error('LOCAL_DB_FIXED_WALL_RAW_BODY_REQUIRED');
        const actualMembership=JSON.parse(body.rawRows.membership[0]);
        if(Object.entries(expected).some(([key,value])=>actualMembership?.[key]!==value))throw new Error('LOCAL_DB_FIXED_WALL_MEMBERSHIP_REQUIRED');
      }else{
      const body=JSON.parse(fs.readFileSync(path.join(directory,'wall-current-full-parent.json'),'utf8'));
      if(body.contract!=='fixed-monolithic-wall-current-parent-read/r1'||body.readOnly!==true||body.sourceMetadataLosslessRoundtrip!==true||body.sourceAdmission!==false||body.full!==false||
          Object.entries(expected).some(([key,value])=>body.membership?.[key]!==value))throw new Error('LOCAL_DB_FIXED_WALL_BODY_REQUIRED');
      }
    }
    for(const [key,name] of (rawWallMode?[['wall','wall-current-complete-raw-parent.json']]:wallMode?[['wall','wall-current-full-parent.json']]:[['panel','panel-current-full-parent.json'],['socket','socket-current-full-parent.json'],['socketScope','socket-scoped-current-source-witness.json']])) {
      const file=path.join(directory,name!);
      if (capture.outputs?.[key!]?.path !== file || capture.outputs[key!].sha256 !== hash(file)) throw new Error('LOCAL_DB_CAPTURE_OUTPUT_HASH_REQUIRED');
    }
  }
  const expectedReports = tests.map((_, index) => `jest-${index}.json`).sort();
  const actualReports = fs.readdirSync(stage).filter(name => /^jest-\d+\.json$/i.test(name)).sort();
  if (JSON.stringify(actualReports) !== JSON.stringify(expectedReports)) throw new Error("LOCAL_DB_EXACT_REPORT_FILE_INVENTORY_REQUIRED");
  const observed: string[] = [];
  const counts = { passedSuites: 0, pendingSuites: 0, failedSuites: 0, totalTests: 0, passedTests: 0, pendingTests: 0, failedTests: 0 };
  for (const [index, test] of tests.entries()) {
    const result = JSON.parse(fs.readFileSync(path.join(stage, `jest-${index}.json`), "utf8"));
    assertExactFocusedJestResults(process.cwd(), [test], result);
    const actual = assertCompletedLocalDbReport(result);
    for (const key of Object.keys(counts) as Array<keyof typeof counts>) counts[key] += actual[key];
    observed.push(...result.testResults.map((suite: { name: string }) => path.resolve(suite.name).toLowerCase()));
  }
  const requested = intersection.map(file => path.resolve(file).toLowerCase()).sort();
  if (JSON.stringify(observed.sort()) !== JSON.stringify(requested)) throw new Error("LOCAL_DB_EXACT_UNION_COVERAGE_REQUIRED");
  if (!Number.isFinite(Date.parse(db.leaseEndUtc)) || Date.now() >= Date.parse(db.leaseEndUtc)) throw new Error("LOCAL_DB_ABSOLUTE_LEASE_EXPIRED_AFTER_RESULTS_IO");
  console.log(JSON.stringify({ focused_jest_coverage: { requestedSuites: intersection.length, observedSuites: observed.length, ...counts, fixedGroup: group, execution: "actual-finite-local-db-window" } }));
  // Removal happens only after actual fresh results and normal closure pass.
  return { ...plan, jestFiles: plan.jestFiles.filter(file => !(tests as readonly string[]).includes(file)) };
}

function runExplicitLocalDatabaseTests(plan: FocusedTestPlan): FocusedTestPlan {
  assertCoordinatedDatabaseInventory(plan);
  if (process.platform === "win32" && LOCAL_DB_GROUPS.some(group => {
    const variable = LOCAL_DB_SPECS[group].variable;
    return process.env[variable] !== undefined || process.env[`${variable}_SHA256`] !== undefined;
  })) {
    const paths = new Set<string>(), directories = new Set<string>(), nonces = new Set<string>(), digests = new Set<string>(), leases = new Set<string>();
    for (const group of LOCAL_DB_GROUPS) {
      const { variable, directory } = LOCAL_DB_SPECS[group], file = process.env[variable], digest = process.env[`${variable}_SHA256`];
      if (!file || !path.isAbsolute(file) || !digest || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("LOCAL_DB_ALL_THREE_PINNED_COMMANDS_REQUIRED");
      const bytes = fs.readFileSync(file);
      if (createHash("sha256").update(bytes).digest("hex") !== digest) throw new Error("LOCAL_DB_COMMAND_HASH_DRIFT");
      const command = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")), db = command.db;
      if (command.commandRole !== "FINITE_DB_VERIFICATION" || command.expectedExit !== 0 || db?.contract !== "gox-finite-db-fixed-groups/v3" ||
          db.group !== group || db.rootThreadId !== "01a1909a-16c4-78e0-958b-a6a44b666b52" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(db.instanceNonce)) throw new Error("LOCAL_DB_COMMAND_CONTRACT_MISMATCH");
      assertFixedLocalDbCapturePrelude(db);
      const key = path.resolve(file).toLowerCase(), output = path.dirname(key),
        start = Date.parse(db.leaseStartUtc), end = Date.parse(db.leaseEndUtc), latest = Date.parse(db.latestAllowedStartUtc);
      if (paths.has(key) || directories.has(output) || nonces.has(db.instanceNonce) || digests.has(digest) || path.basename(output) !== directory ||
          !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(latest) || end-start < 262000 || end-start > 1200000 || end-latest !== 262000 ||
          Date.now() < start || Date.now() > latest) throw new Error("LOCAL_DB_THREE_FRESH_GROUPS_ONE_ABSOLUTE_ROOT_LEASE_REQUIRED");
      paths.add(key); directories.add(output); nonces.add(db.instanceNonce); digests.add(digest);
      leases.add(JSON.stringify([db.leaseStartUtc, db.leaseEndUtc, db.latestAllowedStartUtc, command.sourceFreeze, db.governorPath, db.nodeExecutable, db.powerShellExecutable]));
      if (LOCAL_DB_SPECS[group].tests.some(test => plan.jestFiles.filter(file => file === test).length !== 1)) throw new Error("LOCAL_DB_EXACT_SEVEN_PLAN_REQUIRED_BEFORE_START");
    }
    if (leases.size !== 1) throw new Error("LOCAL_DB_THREE_FRESH_GROUPS_ONE_ABSOLUTE_ROOT_LEASE_REQUIRED");
  }
  let remaining = plan;
  for (const group of LOCAL_DB_GROUPS) remaining = runExplicitLocalDatabaseGroup(remaining, group);
  return remaining;
}
function runOwnedLocalDatabaseOnly(): void {
  const fixedTests = LOCAL_DB_ALL_TESTS;
  let resultAndNormalClosureGuardsCompleted = false;
  try {
    if (process.platform !== "win32") throw new Error("LOCAL_DB_SCOPED_WINDOWS_REQUIRED");
    if (["GOX_HOOK_COORDINATOR_CONTEXT", "GOX_HOOK_COORDINATOR_COMMAND", "GOX_HOOK_COORDINATOR_COMMAND_SHA256"]
        .some(key => process.env[key] !== undefined)) throw new Error("LOCAL_DB_SCOPED_NOT_ORDINARY_COORDINATOR");
    // Check all three explicit bindings before the first owned database window.
    for (const [group, variable] of [
      ["NORMAL_LOCKED_THREE", "GOX_DB_VERIFICATION_COMMAND"],
      ["ASPHALT_PREPARED_THREE", "GOX_DB_ASPHALT_COMMAND"],
      ["MASTER30_PROMPT_INGRESS_ONE", "GOX_DB_MASTER30_COMMAND"],
    ] as const) {
      const file = process.env[variable], digest = process.env[`${variable}_SHA256`];
      if (!file || !path.isAbsolute(file) || !digest || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("LOCAL_DB_SCOPED_ALL_THREE_PINNED_COMMANDS_REQUIRED");
      const bytes = fs.readFileSync(file);
      if (createHash("sha256").update(bytes).digest("hex") !== digest) throw new Error("LOCAL_DB_COMMAND_HASH_DRIFT");
      const command = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
      if (command.commandRole !== "FINITE_DB_VERIFICATION" || command.expectedExit !== 0 ||
          command.db?.contract !== "gox-finite-db-fixed-groups/v3" || command.db.group !== group ||
          command.db.rootThreadId !== "01a1909a-16c4-78e0-958b-a6a44b666b52") throw new Error("LOCAL_DB_COMMAND_CONTRACT_MISMATCH");
      assertFixedLocalDbCapturePrelude(command.db);
    }
    const remaining = runExplicitLocalDatabaseTests({
      jestFiles: fixedTests, nodeFiles: [], nonTestContractFiles: [], removedTestFiles: [],
    });
    if (remaining.jestFiles.length !== 0) throw new Error("LOCAL_DB_SCOPED_EXACT_SEVEN_NOT_COMPLETED");
    resultAndNormalClosureGuardsCompleted = true;
  } finally {
    console.log(JSON.stringify({ scoped_local_db_verification: {
      scope: "FIXED_SEVEN_DB_DIAGNOSTIC_NOT_ORDINARY_HOOK_OR_COMMIT_PASS",
      status: resultAndNormalClosureGuardsCompleted ? "ACTUAL_FIXED_SEVEN_AND_NORMAL_DB_CLOSURE" : "NOT_ACCEPTED",
      requestedTestFiles: fixedTests, resultAndNormalClosureGuardsCompleted,
      ordinaryHookOrCommitPass: false, full: false,
    } }));
  }
}

function main(): void {
  const classification = classifyStagedCommitScope();
  const governedHook = ordinaryHookProfile();
  if (governedHook && classification.scope !== "SOURCE" && classification.scope !== "MIXED") throw new Error("HOOK_COORDINATOR_SOURCE_OR_MIXED_SCOPE_REQUIRED");
  console.log(JSON.stringify({
    scope: classification.scope,
    staged_files: classification.stagedFiles,
    full_jest_requested: false,
    android_requested: false,
    fake_green_claimed: false,
  }, null, 2));

  if (classification.scope === "EMPTY") return;

  run("git", ["diff", "--cached", "--check"]);

  if (classification.scope === "PROOF_ONLY") {
    validateJsonArtifacts(classification.stagedFiles);
    assertNoFakeGreenArtifacts(classification.stagedFiles);
    const artifactRoots = Array.from(new Set(classification.proofFiles.map((file) => file.split("/").slice(0, 2).join("/"))));
    for (const artifactRoot of artifactRoots) {
      if (artifactRoot) {
        run("npx", ["tsx", "scripts/release/scanCloseoutArtifactsForSecrets.ts", artifactRoot, "--check-only"]);
      }
    }
    return;
  }

  if (classification.scope === "MIGRATION") {
    run("npx", ["tsx", "scripts/release/run-bounded-migration-runner.ts", "--dry-run"], { allowFailure: true });
    return;
  }

  if (classification.scope === "SOURCE" || classification.scope === "MIXED") {
    run("npm", ["run", "verify:typecheck"]);
    run("npm", ["run", "lint"]);
    run("npx", ["tsx", "scripts/release/assertNoTestWeakening.ts"]);
    const deleted = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=D", "-z"], {
      cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    if (deleted.status !== 0) throw new Error(deleted.stderr || "STAGED_DELETIONS_READ_FAILED");
    const plan = planFocusedTests(classification.stagedFiles,
      file => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined,
      deleted.stdout.split("\0").filter(Boolean));
    console.log(JSON.stringify({ focused_test_plan: plan }));
    if (governedHook && createHash("sha256").update(JSON.stringify(plan)).digest("hex") !== governedHook.input.hook.focusedPlanSha256) throw new Error("HOOK_FRESH_FOCUSED_PLAN_DRIFT");
    assertCoordinatedDatabaseInventory(plan);
    if (plan.nodeFiles.length) {
      run(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...plan.nodeFiles]);
    }
    const routedPlan = runExplicitLocalDatabaseTests(plan);
    const jestArgGroups = plan.jestFiles.length > 0 && routedPlan.jestFiles.length === 0
      ? [] : focusedJestArgs(classification.stagedFiles, routedPlan);
    if (jestArgGroups.length > 0) {
      const resultDirectory = ordinaryHookJestOutputDirectory();
      console.log(`[pre-commit] Focused Jest result evidence: ${resultDirectory}`);
      for (const [index, jestArgs] of jestArgGroups.entries()) {
        const resultPath = path.join(resultDirectory, `batch-${index + 1}.json`);
        run("npm", [...jestArgs, "--json", "--outputFile", resultPath]);
        const pathFlag = jestArgs.indexOf("--runTestsByPath");
        if (pathFlag >= 0) {
          const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
          assertExactFocusedJestResults(process.cwd(), jestArgs.slice(pathFlag + 1), result);
          console.log(JSON.stringify({ focused_jest_coverage: {
            requestedSuites: jestArgs.length - pathFlag - 1, observedSuites: result.testResults.length,
            pendingSuites: result.numPendingTestSuites, pendingTests: result.numPendingTests,
          } }));
        }
      }
    } else if (!plan.nodeFiles.length && !plan.jestFiles.length) {
      console.log("[pre-commit] No runnable focused test surface; declared removals/non-test contracts logged, typecheck/lint/test-weakening checks completed.");
    }
    const completedProfile = ordinaryHookProfile();
    if (completedProfile && ordinaryHookStageOrdinal !== completedProfile.input.hook.stages.length) throw new Error("HOOK_FRESH_ORDERED_STAGE_PLAN_INCOMPLETE");
    return;
  }

  throw new Error(`BLOCKED_UNKNOWN_PRECOMMIT_SCOPE:${classification.scope}`);
}

const scopedArguments = process.argv.slice(2);
if (scopedArguments.length === 0) {
  main();
} else if (scopedArguments.length === 1 && scopedArguments[0] === "--verify-owned-local-db-only") {
  runOwnedLocalDatabaseOnly();
} else {
  throw new Error("PRECOMMIT_EXACT_SUPPORTED_ARGUMENTS_REQUIRED");
}
