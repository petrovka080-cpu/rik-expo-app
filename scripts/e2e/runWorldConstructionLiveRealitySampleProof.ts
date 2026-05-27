import {
  WORLD_50000_WAVE,
  artifactPath,
  buildLiveRealityRuntimeSample,
  ensureWorld50000Dirs,
  writeJson,
} from "./worldConstruction50000RealityProof.shared";

function main(): void {
  ensureWorld50000Dirs();
  const sample = buildLiveRealityRuntimeSample(500);
  const matrix = {
    wave: WORLD_50000_WAVE,
    final_status: sample.failed === 0 ? "GREEN_WORLD_CONSTRUCTION_50000_LIVE_REALITY_SAMPLE_READY" : "BLOCKED_WORLD_CONSTRUCTION_50000_LIVE_REALITY_SAMPLE",
    live_web_sampled_prompts: sample.tested,
    live_web_sample_passed: sample.failed === 0,
    response_visible_all: sample.results.every((item) => item.responseVisible === true),
    pdf_action_visible_or_not_applicable_all: sample.results.every((item) => item.pdfActionVisible === true),
    generic_known_work_rows_found: sample.results.some((item) => item.genericRowsFound === true),
    fake_green_claimed: false,
  };
  writeJson(artifactPath("live_web_results.json"), {
    ...matrix,
    results: sample.results,
  }, false);
  writeJson(artifactPath("live_web_failures.json"), sample.failures);
  writeJson(artifactPath("live_reality_sample_matrix.json"), matrix);
  console.info(`${matrix.final_status}: ${sample.passed}/${sample.tested}`);
  if (sample.failed > 0) process.exitCode = 1;
}

main();
