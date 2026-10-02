import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

// Read-only definition inventory, deliberately not a product acceptance gate.
// A visible profile is evidence of declared input ownership, not proof that
// every operation/material or engineering norm has been validated.
async function main(): Promise<void> {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  if (root.replace(/\\/gu, "/").toLowerCase() !== "c:/dev/rik-expo-app-r4a5-dc4f0ce7") {
    throw new Error("S2728_COVERAGE_NON_CANONICAL_ROOT");
  }
  const pointer = JSON.parse(readFileSync("data/estimate-benchmarks/r568-local-developer-canonical-release.json", "utf8"));
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL
    ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
  const url = new URL(databaseUrl);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)
    || url.port !== "55432" || url.pathname !== "/rik_r4_runtime_b5_v2") {
    throw new Error("S2728_COVERAGE_DATABASE_NOT_CANONICAL_LOCAL");
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const release = (await client.query(`SELECT id::text,status,activated_at
      FROM public.estimate_definition_release WHERE id=$1`, [pointer.definitionReleaseId])).rows[0];
    if (release?.status !== "prepared" || release.activated_at != null) {
      throw new Error("S2728_COVERAGE_RELEASE_NOT_LOCAL_CANDIDATE");
    }
    const rows = (await client.query(`SELECT m.catalog_id,
      d.id::text AS definition_version_id,d.definition_version,m.source_batch,
      p.parameter_count,p.visible_replaceable_profile_count,p.primary_fact_count,
      p.unclassified_runtime_baseline_count,
      (SELECT count(*)::int FROM public.estimate_formula_graph f WHERE f.definition_version_id=d.id) AS formula_count,
      (SELECT count(*)::int FROM public.estimate_resource_spec r WHERE r.definition_version_id=d.id) AS resource_count
      FROM public.estimate_cumulative_manifest_entry m
      JOIN public.estimate_definition_version d ON d.id=m.definition_version_id
      LEFT JOIN public.estimate_approved_template_baseline b ON b.id=m.approved_template_baseline_id
      CROSS JOIN LATERAL (SELECT count(*)::int AS parameter_count,
        count(*) FILTER (WHERE x.truth_metadata->>'visibility_role'='USER_INPUT'
          AND x.truth_metadata->>'value_source_role'='VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'
          AND b.input_values ? x.parameter_id)::int AS visible_replaceable_profile_count,
        count(*) FILTER (WHERE x.truth_metadata->>'visibility_role'='USER_INPUT'
          AND x.truth_metadata->>'value_source_role'='USER_INPUT'
          AND x.truth_metadata->>'preliminary_compilation_allowed'='false')::int AS primary_fact_count,
        count(*) FILTER (WHERE b.input_values ? x.parameter_id
          AND NOT (coalesce(b.input_classification,'{}'::jsonb) ? x.parameter_id))::int
          AS unclassified_runtime_baseline_count
        FROM public.estimate_parameter_definition x WHERE x.definition_version_id=d.id) p
      WHERE m.release_id=$1 ORDER BY m.catalog_id`, [pointer.definitionReleaseId])).rows;
    await client.query("ROLLBACK");
    const automaticOwners = rows.filter((row) => row.visible_replaceable_profile_count > 0);
    const legacyBaselineReview = rows.filter((row) => row.unclassified_runtime_baseline_count > 0);
    const output = resolve(".release-runtime/r568/s27-28/automatic-parameter-coverage/inventory.json");
    const receipt = {
      contract: "rik-expo-app.s27-28.automatic-parameter-coverage.v1",
      status: "INVENTORY_ONLY_NOT_MASTER_ACCEPTANCE",
      capturedAt: new Date().toISOString(),
      commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      definitionReleaseId: pointer.definitionReleaseId,
      searchReleaseId: pointer.searchReleaseId,
      denominator: { kind: "exact_selected_cumulative_manifest", entries: rows.length },
      globalMasterDenominator: 11610,
      globalMasterCoverageClaimed: false,
      definitionsSha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
      declaredAutomaticOwnerCount: automaticOwners.length,
      declaredAutomaticOwners: automaticOwners,
      legacyUnclassifiedBaselineReviewCount: legacyBaselineReview.length,
      exceptions: rows.filter((row) => row.visible_replaceable_profile_count === 0).map((row) => ({
        ...row,
        reason: "NO_EXPLICIT_REPLACEABLE_PROFILE_CONTRACT; inspect existing norm/derived ownership before any migration",
      })),
      definitions: rows,
      productionAccessed: false,
      databaseMutated: false,
      webAndroidAcceptanceClaimed: false,
    };
    mkdirSync(dirname(output), { recursive: true });
    const temporary = `${output}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`);
    renameSync(temporary, output);
    process.stdout.write(`${JSON.stringify({ output, entries: rows.length,
      declaredAutomaticOwners: automaticOwners.length,
      unclassifiedBaselinesForReview: legacyBaselineReview.length,
      status: receipt.status })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
