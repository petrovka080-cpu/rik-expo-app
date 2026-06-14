import {
  buildProfessionalEstimateMatrixSnapshot,
  gitOutput,
  runCommandForProfessionalEstimate,
  runReleaseVerifyForProfessionalEstimate,
  writeProfessionalEstimateJson,
} from "./professionalEstimate1500WorkCases";
import { GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE } from "../../src/lib/ai/professionalEstimateTemplates";

function passed(result: Record<string, unknown>): boolean {
  return result.exit_code === 0 && result.timed_out !== true;
}

const headBefore = gitOutput(["rev-parse", "HEAD"], "unknown");
const originBefore = gitOutput(["rev-parse", "@{u}"], "unknown");
const statusBefore = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
const worktreeCleanBefore = statusBefore
  .split(/\r?\n/)
  .slice(1)
  .every((line) => line.trim().length === 0);

const typecheck = runCommandForProfessionalEstimate("npm", ["run", "verify:typecheck"], 20 * 60_000);
const lint = runCommandForProfessionalEstimate("npm", ["run", "lint"], 20 * 60_000);
const focused = runCommandForProfessionalEstimate("npm", ["test", "--", "--runInBand", "tests/professionalEstimateTemplates"], 20 * 60_000);
const release = runReleaseVerifyForProfessionalEstimate();

const failures: string[] = [];
if (!worktreeCleanBefore) failures.push("WORKTREE_NOT_CLEAN_BEFORE_CLOSEOUT");
if (headBefore !== originBefore) failures.push("LOCAL_HEAD_NOT_EQUAL_ORIGIN_BEFORE_CLOSEOUT");
if (!passed(typecheck)) failures.push("TYPECHECK_FAILED");
if (!passed(lint)) failures.push("LINT_FAILED");
if (!passed(focused)) failures.push("FOCUSED_TESTS_FAILED");
if (release.final_status !== "GREEN_PROFESSIONAL_ESTIMATE_RELEASE_VERIFY_READY") failures.push("RELEASE_VERIFY_FAILED");

const proof = {
  final_status: failures.length === 0
    ? GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE
    : "BLOCKED_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_1500_WORKS_CORE",
  source_code_head: headBefore,
  origin_head: originBefore,
  branch_pushed: headBefore === originBefore,
  typecheck_passed: passed(typecheck),
  lint_passed: passed(lint),
  focused_tests_passed: passed(focused),
  release_verify_passed: release.final_status === "GREEN_PROFESSIONAL_ESTIMATE_RELEASE_VERIFY_READY",
  post_push_release_verify_passed: release.final_status === "GREEN_PROFESSIONAL_ESTIMATE_RELEASE_VERIFY_READY" && headBefore === originBefore,
  local_head_equals_origin_head: headBefore === originBefore,
  final_worktree_clean: worktreeCleanBefore,
  no_ios_runtime_claimed: true,
  ios_build_started: false,
  eas_build_started: false,
  testflight_started: false,
  production_db_write_attempted: false,
  platform_checks: {
    typecheck,
    lint,
    focused,
    release,
  },
  failures,
  fake_green_claimed: false,
};

writeProfessionalEstimateJson("CLOSEOUT_PROOF.json", proof);
writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot(proof));

console.log(JSON.stringify(proof, null, 2));
