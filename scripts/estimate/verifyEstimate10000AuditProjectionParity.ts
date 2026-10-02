import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildEstimate10000ReadinessManifest } from "./buildEstimate10000ReadinessManifest";
import { buildWorkFamilyCoveragePlan } from "./buildWorkFamilyCoveragePlan";
import { runCertifyAllEstimateNormBindings } from "./certifyAllEstimateNormBindings";
import { buildEstimate10000AuditProjection } from "./estimate10000AuditProjection";

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withoutGeneratedAt<T extends { generated_at?: string }>(value: T): Omit<T, "generated_at"> {
  const { generated_at: _generatedAt, ...rest } = value;
  return rest;
}

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function run(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VERIFY_ESTIMATE_10000_AUDIT_PROJECTION_PARITY_REQUIRES_--all");
  }
  const startedAt = Date.now();
  const baselineManifest = buildEstimate10000ReadinessManifest();
  const baselineCertification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const baselineCatalog = buildWorkFamilyCoveragePlan({ writeFiles: false });
  const projection = buildEstimate10000AuditProjection({ writeCatalogArtifacts: false });

  const checks = {
    manifest_exact_except_generated_at:
      JSON.stringify(withoutGeneratedAt(baselineManifest)) ===
      JSON.stringify(withoutGeneratedAt(projection.manifest)),
    certification_exact:
      JSON.stringify(baselineCertification) === JSON.stringify(projection.certification),
    catalog_exact_except_generated_at:
      JSON.stringify(withoutGeneratedAt(baselineCatalog)) ===
      JSON.stringify(withoutGeneratedAt(projection.catalog)),
    definition_count_exact: projection.definition_count === 10_000,
    compilation_count_exact: projection.compilation_count === 10_000,
  };
  const green = Object.values(checks).every(Boolean);
  const summary = {
    schema: "estimate-10000-audit-projection-parity/v1",
    final_status: green
      ? "GREEN_ESTIMATE_10000_AUDIT_PROJECTION_EXACT_PARITY"
      : "STOP_ESTIMATE_10000_AUDIT_PROJECTION_PARITY_MISMATCH",
    duration_ms: Date.now() - startedAt,
    checks,
    baseline: {
      manifest_sha256_without_generated_at: sha256(withoutGeneratedAt(baselineManifest)),
      certification_sha256: sha256(baselineCertification),
      catalog_sha256_without_generated_at: sha256(withoutGeneratedAt(baselineCatalog)),
    },
    projection: {
      manifest_sha256_without_generated_at: sha256(withoutGeneratedAt(projection.manifest)),
      certification_sha256: sha256(projection.certification),
      catalog_sha256_without_generated_at: sha256(withoutGeneratedAt(projection.catalog)),
      definition_count: projection.definition_count,
      compilation_count: projection.compilation_count,
    },
    production_touched: false,
    deploy_started: false,
    release_started: false,
    fake_green_claimed: false,
  };
  const outputPath = path.resolve(
    process.cwd(),
    argument("output") ?? ".release-runtime/r568/s27-8/performance/estimate10000-audit-projection-parity.json",
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    ...summary,
    output: path.relative(process.cwd(), outputPath).replace(/\\/gu, "/"),
  }, null, 2)}\n`);
  if (!green) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("/scripts/estimate/verifyEstimate10000AuditProjectionParity.ts")) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
