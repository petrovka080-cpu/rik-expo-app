import { resolve } from "node:path";

import {
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  buildEstimate10000ReadinessManifestFromTemplates,
  buildEstimate10000ReadinessTemplate,
  type Estimate10000ReadinessManifest,
  type Estimate10000ReadinessTemplate,
} from "./buildEstimate10000ReadinessManifest";
import {
  buildWorkFamilyCoveragePlan,
  type WorkFamilyCoveragePlan,
} from "./buildWorkFamilyCoveragePlan";
import {
  buildEstimateNormBindingCertificationSummary,
  consumeEstimateNormBindingCertification,
  createEstimateNormBindingCertificationAccumulator,
  type EstimateNormBindingCertificationSummary,
} from "./certifyAllEstimateNormBindings";
import {
  estimateAuditSourceInputSha256,
  readContentAddressedEstimateAuditCache,
  writeContentAddressedEstimateAuditCache,
} from "./contentAddressedEstimateAuditCache";

export type Estimate10000AuditProjection = Readonly<{
  schema: "estimate-10000-audit-projection/v1";
  built_at: string;
  definition_count: number;
  compilation_count: number;
  manifest: Estimate10000ReadinessManifest;
  certification: EstimateNormBindingCertificationSummary;
  catalog: WorkFamilyCoveragePlan;
}>;

const AUDIT_PROJECTION_CACHE_SCHEMA = "estimate-10000-audit-projection-cache/v1";
const AUDIT_PROJECTION_CACHE_ROOT = resolve(
  ".release-runtime/estimate-10000-audit-projection/content-addressed-cache",
);

function auditProjectionInputSha256(): string {
  return estimateAuditSourceInputSha256(
    `${AUDIT_PROJECTION_CACHE_SCHEMA}\0writeCatalogArtifacts=false`,
  );
}

function isCompleteAuditProjection(value: unknown): value is Estimate10000AuditProjection {
  if (!value || typeof value !== "object") return false;
  const projection = value as Estimate10000AuditProjection;
  return projection.schema === "estimate-10000-audit-projection/v1" &&
    projection.definition_count === 10_000 &&
    projection.compilation_count === 10_000 &&
    projection.manifest?.manifest_total_templates === 10_000 &&
    projection.manifest?.templates?.length === 10_000 &&
    projection.certification != null &&
    projection.catalog != null;
}

/**
 * Builds all complete-10k audit views during one request-scoped compilation
 * pass. Compiled estimates are released immediately; a source-addressed cache
 * retains only the validated projection and is bypassed for artifact writes.
 */
export function buildEstimate10000AuditProjection(options: {
  writeCatalogArtifacts?: boolean;
} = {}): Estimate10000AuditProjection {
  const cacheInputSha256 = options.writeCatalogArtifacts === true
    ? null
    : auditProjectionInputSha256();
  const cachePath = cacheInputSha256 == null
    ? null
    : resolve(AUDIT_PROJECTION_CACHE_ROOT, `${cacheInputSha256}.json`);
  const cached = cachePath == null || cacheInputSha256 == null
    ? null
    : readContentAddressedEstimateAuditCache({
      cachePath,
      inputSha256: cacheInputSha256,
      schema: AUDIT_PROJECTION_CACHE_SCHEMA,
      validate: isCompleteAuditProjection,
    });
  if (cached) return cached;

  const builtAt = new Date().toISOString();
  const templates: Estimate10000ReadinessTemplate[] = [];
  const certificationAccumulator = createEstimateNormBindingCertificationAccumulator();
  let compilationCount = 0;

  const catalog = buildWorkFamilyCoveragePlan({
    writeFiles: options.writeCatalogArtifacts === true,
    summaryOnlyRowReality: true,
    projectionSink: (entry) => {
      const expectedDefinition = PRODUCTION_WORK_DEFINITIONS_10000[compilationCount];
      if (!expectedDefinition || expectedDefinition.workKey !== entry.definition.workKey) {
        throw new Error(`estimate_10000_projection_definition_order_mismatch:${entry.definition.workKey}`);
      }
      compilationCount += 1;
      templates.push(buildEstimate10000ReadinessTemplate(entry.definition, entry));
      consumeEstimateNormBindingCertification({
        accumulator: certificationAccumulator,
        definition: entry.definition,
        rows: entry.estimate.rows,
      });
    },
  });

  if (compilationCount !== PRODUCTION_WORK_DEFINITIONS_10000.length) {
    throw new Error(`estimate_10000_projection_compilation_count_mismatch:${compilationCount}`);
  }

  const projection: Estimate10000AuditProjection = {
    schema: "estimate-10000-audit-projection/v1",
    built_at: builtAt,
    definition_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    compilation_count: compilationCount,
    manifest: buildEstimate10000ReadinessManifestFromTemplates(templates, builtAt),
    certification: buildEstimateNormBindingCertificationSummary(certificationAccumulator),
    catalog,
  };
  if (cachePath && cacheInputSha256) {
    writeContentAddressedEstimateAuditCache({
      cachePath,
      inputSha256: cacheInputSha256,
      payload: projection,
      schema: AUDIT_PROJECTION_CACHE_SCHEMA,
      validate: isCompleteAuditProjection,
    });
  }
  return projection;
}
