import {
  GREEN_WORK_ONTOLOGY_10000,
  GREEN_WORK_ONTOLOGY_ANDROID_API34,
  GREEN_WORK_ONTOLOGY_CONFUSION_500,
  GREEN_WORK_ONTOLOGY_IOS_PROTOCOL,
  GREEN_WORK_ONTOLOGY_RECIPE_1000,
  GREEN_WORK_ONTOLOGY_RELEASE_VERIFY,
  gitOutput,
  readWaveJson,
  runReleaseVerify,
  sourceCodeHead,
  writeWaveJson,
  writeWaveText,
  type WaveJson,
} from "./workOntology10000.shared";

type Artifact = WaveJson & {
  final_status?: string;
  source_code_head?: string;
  current_head_at_write_time?: string;
  fake_green_claimed?: boolean;
  failures?: unknown[];
  blockers?: unknown[];
};

function artifact(name: string): Artifact | null {
  return readWaveJson<Artifact>(name);
}

function passedStatus(value: Artifact | null, greenStatus: string): boolean {
  return value?.final_status === greenStatus && value.fake_green_claimed === false;
}

function failuresOf(value: Artifact | null): unknown[] {
  return Array.isArray(value?.failures) ? value.failures : [];
}

function worktreeClean(): boolean {
  return gitOutput(["status", "--short"], "") === "";
}

function branchSynced(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const counts = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "1 1");
  const [ahead = "1", behind = "1"] = counts.split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function currentHeadMatchesArtifacts(artifacts: readonly (Artifact | null)[]): boolean {
  const head = sourceCodeHead();
  return artifacts
    .filter((item): item is Artifact => item !== null)
    .every((item) =>
      item.source_code_head === head &&
      item.current_head_at_write_time === head &&
      item.fake_green_claimed === false
    );
}

export function runWorkOntologyCloseout() {
  const audit = artifact("intent_recognition_10000_results.json");
  const confusion = artifact("confusion_pairs_500_results.json");
  const recipe = artifact("recipe_binding_1000_results.json");
  const web = artifact("web_results.json");
  const responsive = artifact("responsive_results.json");
  const android = artifact("android_api34_results.json");
  const ios = artifact("ios_protocol_readiness.json");
  const release = runReleaseVerify() as Artifact;
  const artifacts = [audit, confusion, recipe, web, responsive, android, ios, release];

  const blockers = [
    ...(passedStatus(audit, GREEN_WORK_ONTOLOGY_10000) ? [] : ["INTENT_RECOGNITION_10000_NOT_GREEN"]),
    ...(passedStatus(confusion, GREEN_WORK_ONTOLOGY_CONFUSION_500) ? [] : ["CONFUSION_500_NOT_GREEN"]),
    ...(passedStatus(recipe, GREEN_WORK_ONTOLOGY_RECIPE_1000) ? [] : ["RECIPE_1000_NOT_GREEN"]),
    ...(web?.final_status === "GREEN_WORK_ONTOLOGY_WEB_ALL_BROWSERS_READY" ? [] : ["WEB_ALL_BROWSERS_NOT_GREEN"]),
    ...(responsive?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_READY" ? [] : ["RESPONSIVE_NOT_GREEN"]),
    ...(
      android?.final_status === GREEN_WORK_ONTOLOGY_ANDROID_API34 &&
      android.android_api34_tested === true &&
      android.actual_api === 34 &&
      android.api36_rejected === true &&
      android.api36_used_as_substitute === false &&
      failuresOf(android).length === 0
        ? []
        : ["ANDROID_API34_NOT_GREEN"]
    ),
    ...(
      ios?.final_status === GREEN_WORK_ONTOLOGY_IOS_PROTOCOL &&
      ios.ios_build_started === false &&
      ios.eas_build_started === false &&
      ios.testflight_started === false &&
      ios.estimate_core_protocol_covered === true
        ? []
        : ["IOS_PROTOCOL_NOT_GREEN"]
    ),
    ...(release.final_status === GREEN_WORK_ONTOLOGY_RELEASE_VERIFY ? [] : ["RELEASE_VERIFY_NOT_GREEN"]),
    ...(Array.isArray(release.blockers) && release.blockers.length === 0 ? [] : ["RELEASE_VERIFY_BLOCKERS"]),
    ...(worktreeClean() ? [] : ["WORKTREE_DIRTY_BEFORE_CLOSEOUT_WRITE"]),
    ...(branchSynced() ? [] : ["BRANCH_NOT_SYNCED_WITH_UPSTREAM"]),
    ...(currentHeadMatchesArtifacts(artifacts) ? [] : ["SOURCE_HEAD_MISMATCH"]),
  ];

  const matrix = {
    final_status: blockers.length === 0 ? GREEN_WORK_ONTOLOGY_10000 : "BLOCKED_WORK_ONTOLOGY_10000_CLOSEOUT",
    exact_match_count: audit?.exact_match_count ?? null,
    exact_match_rate: audit?.exact_match_rate ?? null,
    high_confidence_wrong_count: audit?.high_confidence_wrong_count ?? null,
    selected_work_key_lost: audit?.selected_work_key_lost ?? null,
    generic_fallback_count: audit?.generic_fallback_count ?? null,
    missing_recipe_count: audit?.missing_recipe_count ?? null,
    missing_pricebook_scope_count: audit?.missing_pricebook_scope_count ?? null,
    confusion_500_passed: passedStatus(confusion, GREEN_WORK_ONTOLOGY_CONFUSION_500),
    recipe_1000_passed: passedStatus(recipe, GREEN_WORK_ONTOLOGY_RECIPE_1000),
    web_all_browsers_passed: web?.final_status === "GREEN_WORK_ONTOLOGY_WEB_ALL_BROWSERS_READY",
    responsive_passed: responsive?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_READY",
    android_api34_tested: android?.android_api34_tested === true,
    actual_api: android?.actual_api ?? null,
    api36_rejected: android?.api36_rejected === true,
    api36_used_as_substitute: android?.api36_used_as_substitute === true,
    ios_build_started: ios?.ios_build_started === true,
    eas_build_started: ios?.eas_build_started === true,
    testflight_started: ios?.testflight_started === true,
    ios_protocol_ready: ios?.estimate_core_protocol_covered === true,
    release_verify_passed: release.final_status === GREEN_WORK_ONTOLOGY_RELEASE_VERIFY,
    release_readiness: release.readiness ?? null,
    release_blockers: release.blockers ?? null,
    source_code_head_matches: currentHeadMatchesArtifacts(artifacts),
    source_head: sourceCodeHead(),
    local_head: gitOutput(["rev-parse", "HEAD"], ""),
    origin_head: gitOutput(["rev-parse", "@{u}"], ""),
    worktree_clean_before_closeout_write: worktreeClean(),
    branch_synced_before_closeout_write: branchSynced(),
    blockers,
    fake_green_claimed: false,
  };

  writeWaveJson("matrix.json", matrix);
  writeWaveText(
    "proof.md",
    [
      "# Work Ontology 10000 Closeout",
      "",
      `Status: ${matrix.final_status}`,
      `Exact matches: ${String(matrix.exact_match_count)} (${String(matrix.exact_match_rate)})`,
      `Confusion 500: ${String(matrix.confusion_500_passed)}`,
      `Recipe 1000: ${String(matrix.recipe_1000_passed)}`,
      `Web all browsers: ${String(matrix.web_all_browsers_passed)}`,
      `Responsive: ${String(matrix.responsive_passed)}`,
      `Android API34: ${String(matrix.android_api34_tested)} actual=${String(matrix.actual_api)}`,
      `iOS protocol ready: ${String(matrix.ios_protocol_ready)}`,
      `Release verify: ${String(matrix.release_verify_passed)}`,
      `Blockers: ${blockers.join(", ") || "none"}`,
      "Fake green claimed: false",
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify(matrix, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
  return matrix;
}

if (require.main === module) {
  runWorkOntologyCloseout();
}
