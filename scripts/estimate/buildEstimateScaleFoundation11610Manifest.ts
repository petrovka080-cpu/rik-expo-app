import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import baseManifestJson from "../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplatesJson from "../../data/estimate-catalog/expanded-complex/templates.json";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildCatalogProfessionalCoverageLedgerV4,
  buildEstimateScaleFoundationManifest,
  ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS,
  ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS,
  type EstimateScaleFoundationAuditEvidence,
  type EstimateScaleFoundationWorkProof,
} from "../../src/lib/estimate/v4/catalogProfessionalCoverageLedgerV4";
import {
  gitOutput,
  timestampForPath,
  writeJson,
} from "./buildControlledPilotHealthDashboard";

type JsonRow = Record<string, unknown>;
type AuditArtifactSpec = {
  auditId: EstimateScaleFoundationAuditEvidence["auditId"];
  root: string;
  ledgerName: string;
  summaryName: string;
};

const RUNTIME_ROOT = path.join(
  ".release-runtime",
  "estimate-scale-foundation-11610",
);
const AUDIT_SPECS: readonly AuditArtifactSpec[] = [
  {
    auditId: "full11610WorkOutputAudit",
    root: path.join(".release-runtime", "ai-estimate-11610-work-passports"),
    ledgerName: "output-audit-ledger.jsonl",
    summaryName: "output-audit-summary.json",
  },
  {
    auditId: "full11610TrustedCostingAudit",
    root: path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook"),
    ledgerName: "trusted-costing-ledger.jsonl",
    summaryName: "summary.json",
  },
  {
    auditId: "full11610RealNamedBoqAudit",
    root: path.join(".release-runtime", "ai-estimate-real-named-boq-line-items"),
    ledgerName: "real-named-boq-line-items-ledger.jsonl",
    summaryName: "summary.json",
  },
  {
    auditId: "full11610MaterialQuantityAccuracyAudit",
    root: path.join(".release-runtime", "ai-estimate-material-quantity-accuracy"),
    ledgerName: "material-quantity-accuracy-ledger.jsonl",
    summaryName: "summary.json",
  },
  {
    auditId: "full11610MaterialCompletenessAudit",
    root: path.join(".release-runtime", "ai-estimate-material-completeness"),
    ledgerName: "material-completeness-ledger.jsonl",
    summaryName: "summary.json",
  },
] as const;

function readJson(filePath: string): JsonRow {
  return JSON.parse(readFileSync(filePath, "utf8")) as JsonRow;
}

function readJsonl(filePath: string): JsonRow[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JsonRow);
}

function latestExactShaArtifact(
  spec: AuditArtifactSpec,
  sourceSha: string,
): { summaryPath: string; ledgerPath: string; summary: JsonRow } {
  if (!existsSync(spec.root)) {
    throw new Error(`SCALE_FOUNDATION_AUDIT_ROOT_MISSING:${spec.auditId}:${spec.root}`);
  }
  const matches: {
    summaryPath: string;
    ledgerPath: string;
    summary: JsonRow;
    mtimeMs: number;
  }[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      const fullPath = path.join(directory, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (entry !== spec.summaryName) continue;
      const summary = readJson(fullPath);
      const ledgerPath = path.join(directory, spec.ledgerName);
      if (
        summary.source_sha === sourceSha &&
        existsSync(ledgerPath)
      ) {
        matches.push({
          summaryPath: fullPath,
          ledgerPath,
          summary,
          mtimeMs: stats.mtimeMs,
        });
      }
    }
  };
  visit(spec.root);
  const match = matches.sort(
    (left, right) => right.mtimeMs - left.mtimeMs,
  )[0];
  if (!match) {
    throw new Error(
      `SCALE_FOUNDATION_EXACT_SHA_AUDIT_EVIDENCE_MISSING:${spec.auditId}:${sourceSha}`,
    );
  }
  const finalStatus = String(
    match.summary.final_status ??
    match.summary.source_audit_status ??
    "",
  );
  if (!finalStatus.startsWith("GREEN_")) {
    throw new Error(
      `SCALE_FOUNDATION_AUDIT_NOT_GREEN:${spec.auditId}:${finalStatus || "missing"}`,
    );
  }
  return match;
}

function indexRows(rows: readonly JsonRow[], auditId: string): Map<string, JsonRow> {
  const result = new Map<string, JsonRow>();
  for (const row of rows) {
    const templateId = String(row.template_id ?? "");
    if (!templateId) {
      throw new Error(`SCALE_FOUNDATION_TEMPLATE_ID_MISSING:${auditId}`);
    }
    if (result.has(templateId)) {
      throw new Error(
        `SCALE_FOUNDATION_DUPLICATE_TEMPLATE_ID:${auditId}:${templateId}`,
      );
    }
    result.set(templateId, row);
  }
  if (result.size !== ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS) {
    throw new Error(
      `SCALE_FOUNDATION_AUDIT_ROW_TOTAL_MISMATCH:${auditId}:${result.size}/${ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS}`,
    );
  }
  return result;
}

function noBlockers(row: JsonRow | undefined): boolean {
  return (
    Boolean(row) &&
    Array.isArray(row?.blocking_reasons) &&
    row.blocking_reasons.length === 0
  );
}

function buildTemplateCatalogIdMap(): Map<string, string> {
  const baseRows = (
    baseManifestJson as { templates: { template_id: string; work_key: string }[] }
  ).templates;
  const expandedRows = expandedTemplatesJson as { template_id: string }[];
  const result = new Map<string, string>();
  for (const row of baseRows) result.set(row.template_id, row.work_key);
  for (const row of expandedRows) {
    result.set(row.template_id, `expanded-template:${row.template_id}`);
  }
  if (result.size !== ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS) {
    throw new Error(
      `SCALE_FOUNDATION_CATALOG_ID_MAP_TOTAL_MISMATCH:${result.size}/${ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS}`,
    );
  }
  return result;
}

export function buildEstimateScaleFoundation11610FromAuditArtifacts(input: {
  sourceSha?: string;
  generatedAt?: string;
  writeArtifacts?: boolean;
} = {}) {
  const sourceSha = input.sourceSha ?? gitOutput(["rev-parse", "HEAD"]);
  const artifacts = AUDIT_SPECS.map((spec) => ({
    spec,
    ...latestExactShaArtifact(spec, sourceSha),
  }));
  const evidence: EstimateScaleFoundationAuditEvidence[] = artifacts.map(
    ({ spec, summary, summaryPath, ledgerPath }) => ({
      auditId: spec.auditId,
      sourceSha: String(summary.source_sha ?? ""),
      finalStatus: String(
        summary.final_status ?? summary.source_audit_status ?? "",
      ),
      summaryPath,
      ledgerPath,
    }),
  );
  const ledgers = Object.fromEntries(
    artifacts.map(({ spec, ledgerPath }) => [
      spec.auditId,
      indexRows(readJsonl(ledgerPath), spec.auditId),
    ]),
  ) as Record<
    EstimateScaleFoundationAuditEvidence["auditId"],
    Map<string, JsonRow>
  >;
  const catalogIdByTemplateId = buildTemplateCatalogIdMap();
  const coverageByCatalogId = new Map(
    buildCatalogProfessionalCoverageLedgerV4().rows.map((row) => [
      row.catalogId,
      row,
    ]),
  );
  const proofs: EstimateScaleFoundationWorkProof[] = [];

  for (const [index, [templateId, catalogId]] of [
    ...catalogIdByTemplateId.entries(),
  ].entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    const coverage = coverageByCatalogId.get(catalogId);
    const output = ledgers.full11610WorkOutputAudit.get(templateId);
    const costing = ledgers.full11610TrustedCostingAudit.get(templateId);
    const realNamed = ledgers.full11610RealNamedBoqAudit.get(templateId);
    const materialQuantity =
      ledgers.full11610MaterialQuantityAccuracyAudit.get(templateId);
    const materialCompleteness =
      ledgers.full11610MaterialCompletenessAudit.get(templateId);
    const independentProfessionalOwner =
      coverage?.resolution === "PROFESSIONAL_ESTIMATE" &&
      coverage.state === "DISTINCT_PROFESSIONAL_PASSPORT";
    const outputReady =
      output?.estimate_generated === true &&
      output?.snapshot_valid === true &&
      output?.pdf_valid === true &&
      output?.buyer_handoff_valid === true &&
      noBlockers(output);
    const realNamedReady = noBlockers(realNamed);
    const materialQuantityReady =
      materialQuantity?.status === "READY_MATERIAL_QUANTITY_ACCURATE" &&
      noBlockers(materialQuantity);
    const materialCompletenessReady =
      materialCompleteness?.status === "READY_MATERIAL_COMPLETE" &&
      noBlockers(materialCompleteness);
    const trustedCostingReady =
      costing?.status === "READY_TRUSTED_COSTING" &&
      noBlockers(costing);
    const blockers = [
      passport ? "" : "work_passport_missing",
      coverage ? "" : "catalog_coverage_missing",
      output ? "" : "work_output_audit_row_missing",
      costing ? "" : "trusted_costing_audit_row_missing",
      realNamed ? "" : "real_named_boq_audit_row_missing",
      materialQuantity ? "" : "material_quantity_audit_row_missing",
      materialCompleteness ? "" : "material_completeness_audit_row_missing",
    ].filter(Boolean);

    proofs.push({
      workId: catalogId,
      catalogPresent: Boolean(coverage),
      passportId: passport
        ? `estimate-work-passport:${catalogId}`
        : null,
      passportVersion: passport
        ? ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS.workPassport
        : null,
      parameterSchemaId: passport?.parameterSchema.schemaId ?? null,
      familyCalculatorId: passport?.contentPack.calculatorId ?? null,
      formulaGraphVersion: passport
        ? `${passport.formulas.formulaFamilyId}:v1`
        : null,
      normativeSourceIds: passport?.sources.sourceRegistryIds ?? [],
      pricePolicyId: passport?.contentPack.pricePolicyId ?? null,
      deterministicCompilerVersion: passport
        ? ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS.deterministicCompiler
        : null,
      validatorVersion: passport
        ? ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS.validator
        : null,
      quantityOutputReady: independentProfessionalOwner && outputReady,
      realNamedBoqReady: independentProfessionalOwner && realNamedReady,
      materialQuantityReady:
        independentProfessionalOwner && materialQuantityReady,
      materialCompletenessReady:
        independentProfessionalOwner && materialCompletenessReady,
      trustedCostingReady:
        independentProfessionalOwner && trustedCostingReady,
      contractTotalEvidenceReady:
        independentProfessionalOwner &&
        costing?.contract_total_allowed === true,
      procurementEvidenceReady:
        independentProfessionalOwner &&
        trustedCostingReady &&
        output?.buyer_handoff_valid === true,
      normativelyExpertVerified: false,
      rollbackCompatible: Boolean(passport),
      revisionCompatible: Boolean(passport),
      claimedProfessionalEstimateReady:
        independentProfessionalOwner &&
        outputReady &&
        realNamedReady &&
        materialQuantityReady &&
        materialCompletenessReady,
      claimedContractCostReady:
        independentProfessionalOwner &&
        costing?.contract_total_allowed === true,
      blockers,
    });
    if (index > 0 && index % 100 === 0) {
      clearProfessionalWorkPassportBuildCaches();
    }
  }
  clearProfessionalWorkPassportBuildCaches();

  const manifest = buildEstimateScaleFoundationManifest({
    sourceSha,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    proofs,
    auditEvidence: evidence,
  });
  const outDir = input.writeArtifacts === false
    ? null
    : path.join(RUNTIME_ROOT, timestampForPath());
  const manifestPath = outDir ? path.join(outDir, "manifest.json") : null;
  const readinessLedgerPath = outDir
    ? path.join(outDir, "readiness-ledger.jsonl")
    : null;
  if (outDir && manifestPath && readinessLedgerPath) {
    mkdirSync(outDir, { recursive: true });
    writeJson(manifestPath, manifest);
    writeFileSync(
      readinessLedgerPath,
      `${manifest.rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
      "utf8",
    );
  }
  return { manifest, manifestPath, readinessLedgerPath };
}

if (require.main === module) {
  const result = buildEstimateScaleFoundation11610FromAuditArtifacts();
  console.log(JSON.stringify({
    schema: result.manifest.schema,
    source_sha: result.manifest.sourceSha,
    work_total: result.manifest.workTotal,
    unique_work_total: result.manifest.uniqueWorkTotal,
    readiness_counts: result.manifest.readinessCounts,
    quarantined_work_count: result.manifest.quarantinedWorkCount,
    false_ready_count: result.manifest.falseReadyCount,
    admission_ready_for_group_01:
      result.manifest.admissionReadyForGroup01,
    blockers: result.manifest.blockers,
    manifest_path: result.manifestPath,
    readiness_ledger_path: result.readinessLedgerPath,
  }, null, 2));
  if (!result.manifest.admissionReadyForGroup01) process.exitCode = 1;
}
