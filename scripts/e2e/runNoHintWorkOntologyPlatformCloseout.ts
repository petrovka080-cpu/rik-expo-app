import {
  assertNoHintFailures,
  buildNoHintMatrixSnapshot,
  currentHeadAtWriteTime,
  gitOutput,
  readNoHintJson,
  runReleaseVerifyForNoHint,
  sourceCodeHead,
  writeNoHintJson,
} from "./noHintRealUserWorkCorpus";
import { GREEN_NO_HINT_WORK_ONTOLOGY } from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";

export function runNoHintWorkOntologyPlatformCloseout() {
  const release = runReleaseVerifyForNoHint();
  const semantic = readNoHintJson<{ final_status?: string; summary?: Record<string, unknown> }>("no_hint_semantic_results.json");
  const confusion = readNoHintJson<{ final_status?: string; summary?: Record<string, unknown> }>("no_hint_confusion_results.json");
  const ranking = readNoHintJson<{ final_status?: string }>("candidate_ranking_results.json");
  const head = currentHeadAtWriteTime();
  const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
  const failures: unknown[] = [];

  if (semantic?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`SEMANTIC_${semantic?.final_status ?? "MISSING"}`);
  if (confusion?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`CONFUSION_${confusion?.final_status ?? "MISSING"}`);
  if (ranking?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`RANKING_${ranking?.final_status ?? "MISSING"}`);
  if (release.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`RELEASE_${String(release.final_status)}`);
  if (head !== originHead) failures.push(`BRANCH_NOT_PUSHED:${head}:${originHead}`);

  const closeout = {
    final_status: failures.length === 0 ? GREEN_NO_HINT_WORK_ONTOLOGY : "BLOCKED_WORK_ONTOLOGY_NO_HINT_PLATFORM_CLOSEOUT",
    source_code_head: sourceCodeHead(),
    artifact_commit_before_closeout: head,
    origin_head: originHead,
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    branch_pushed: head === originHead,
    release_verify_passed: release.final_status === GREEN_NO_HINT_WORK_ONTOLOGY,
    post_push_release_verify_passed: release.final_status === GREEN_NO_HINT_WORK_ONTOLOGY && head === originHead,
    no_ios_runtime_claimed: true,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    failures,
    fake_green_claimed: false,
  };
  writeNoHintJson("CLOSEOUT_PROOF.json", closeout);
  writeNoHintJson("matrix.json", buildNoHintMatrixSnapshot({
    ...closeout,
    release_verify_status: release.final_status,
    closeout_status: closeout.final_status,
  }));

  console.log(JSON.stringify(closeout, null, 2));
  assertNoHintFailures(failures, "NO_HINT_PLATFORM_CLOSEOUT_FAILED");
  return closeout;
}

if (require.main === module) {
  runNoHintWorkOntologyPlatformCloseout();
}
