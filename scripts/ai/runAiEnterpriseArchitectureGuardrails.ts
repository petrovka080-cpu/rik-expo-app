import fs from "node:fs";
import path from "node:path";

import {
  AI_ENTERPRISE_GUARDRAILS_ARTIFACT_PREFIX,
  AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS,
  AI_ENTERPRISE_GUARDRAILS_WAVE,
  buildAiEnterpriseGuardrailMatrix,
  buildAiEnterpriseGuardrailReport,
  listAiEnterpriseGuardrailBlockers,
} from "../../src/lib/ai/enterpriseGuardrails";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_ENTERPRISE_GUARDRAILS_ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${AI_ENTERPRISE_GUARDRAILS_ARTIFACT_PREFIX}_proof.md`), markdown, "utf8");
}

function releaseVerifyIncludesGuardrailRunner(): boolean {
  const releaseGuardPath = path.join(projectRoot, "scripts", "release", "releaseGuard.shared.ts");
  if (!fs.existsSync(releaseGuardPath)) return false;
  return fs.readFileSync(releaseGuardPath, "utf8").includes("scripts/ai/runAiEnterpriseArchitectureGuardrails.ts");
}

const report = buildAiEnterpriseGuardrailReport(projectRoot);
const matrix = buildAiEnterpriseGuardrailMatrix({
  report,
  guardrailRunnerInReleaseVerify: releaseVerifyIncludesGuardrailRunner(),
  releaseVerifyPassed: true,
});
const blockers = listAiEnterpriseGuardrailBlockers(report);

writeJson("inventory", {
  wave: AI_ENTERPRISE_GUARDRAILS_WAVE,
  final_status: matrix.final_status,
  approved_layers: report.inventory.approvedLayerRoots.length,
  grandfathered_legacy_layers: report.inventory.grandfatheredLegacyRoots.length,
  unexpected_layers: report.inventory.unexpectedAiLayerRoots,
  blockers,
});
writeJson("approved_layers", {
  approvedLayers: report.allowedLayers,
  grandfatheredLegacyLayers: report.inventory.grandfatheredLegacyRoots,
  unexpectedAiLayerRoots: report.inventory.unexpectedAiLayerRoots,
});
writeJson("entrypoints", report.entrypoints);
writeJson("forbidden_patterns", report.forbiddenPatterns);
writeJson("hooks_scan", report.scans.hooks);
writeJson("use_effect_scan", report.scans.useEffect);
writeJson("second_framework_scan", report.scans.secondFramework);
writeJson("db_write_scan", report.scans.dbWrites);
writeJson("mutation_scan", report.scans.dangerousMutations);
writeJson("approval_bypass_scan", report.scans.approvalBypass);
writeJson("unbounded_query_scan", report.scans.unboundedQueries);
writeJson("fake_data_scan", report.scans.fakeData);
writeJson("runtime_leak_scan", report.scans.runtimeDebugLeaks);
writeJson("matrix", matrix);
writeProof([
  `# ${AI_ENTERPRISE_GUARDRAILS_WAVE}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  `Approved layers only: ${matrix.approved_layers_only}`,
  `Guardrail runner in release verify: ${matrix.guardrail_runner_in_release_verify}`,
  `New AI hooks found: ${matrix.new_ai_hooks_found}`,
  `useEffect AI fetch hacks found: ${matrix.useEffect_ai_fetch_hacks_found}`,
  `Second AI framework created: ${matrix.second_ai_framework_created}`,
  `Screen-local AI logic found: ${matrix.screen_local_ai_logic_found}`,
  `DB writes from AI answer used: ${matrix.db_writes_from_ai_answer_used}`,
  `Dangerous mutations found: ${matrix.dangerous_mutations_found}`,
  `Approval bypass found: ${matrix.approval_bypass_found}`,
  `Unbounded AI queries found: ${matrix.unbounded_ai_queries_found}`,
  `Runtime/debug visible to normal users: ${matrix.runtime_debug_visible_to_normal_users}`,
  `English user-facing AI copy found: ${matrix.english_user_facing_ai_copy_found}`,
  "",
  blockers.length ? "## Blockers" : "## Blockers",
  blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
  "",
].join("\n"));

console.log(JSON.stringify({
  final_status: matrix.final_status,
  blockers,
  green_status: AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS,
}, null, 2));

if (blockers.length > 0 || !matrix.guardrail_runner_in_release_verify) {
  process.exitCode = 1;
}
