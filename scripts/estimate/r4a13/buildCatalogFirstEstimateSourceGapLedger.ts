import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  CatalogSourceRegistration,
  classifyCatalogGapResolutionRoute,
  classifyCatalogSourceGap,
  isProfessionalDeclaredSourceId,
  normalizeDeclaredSourceIds,
} from "./catalogFirstEstimateSourceGapLedger.shared";
import { isCatalogFirstEstimateProjectSpecificRefinementParameter } from "./catalogFirstEstimateMinimumInputAudit.shared";

type Json = Record<string, any>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "c26dc62b-7473-50c5-b6cf-f06bda839f44";
const AUDIT_PATH = resolve(process.env.R4A13_AUDIT_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/catalog-minimum-input-audit-v11/catalog-first-estimate-audit.json");
const SOURCE_REGISTRY_PATH = resolve(process.env.R4A13_SOURCE_REGISTRY_PATH
  ?? "data/estimate-catalog/source-registry.json");
const PRIMARY_SOURCE_MANIFEST_PATH = resolve(process.env.R4A13_PRIMARY_SOURCE_MANIFEST_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/primary-source-review/primary-source-artifact-manifest.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/source-gap-ledger-v1");
const CONTRACT = "rik-expo-app.r4-a13-6.catalog-source-gap-ledger.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`CATALOG_SOURCE_GAP_LEDGER:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeAtomic(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, value, "utf8");
  renameSync(pending, path);
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  return Object.fromEntries([...values.reduce((counts, value) => {
    const id = key(value);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort((left, right) =>
    right[1] - left[1] || left[0].localeCompare(right[0])));
}

function markdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  return [rows[0], rows[0].map(() => "---"), ...rows.slice(1)]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
}

async function main(): Promise<void> {
  const auditBytes = readFileSync(AUDIT_PATH, "utf8");
  const audit = JSON.parse(auditBytes) as Json;
  invariant(audit.schemaVersion === "rik-expo-app.r4-a13-6.catalog-minimum-input-audit.v1", "AUDIT_CONTRACT_MISMATCH");
  invariant(audit.candidate?.definitionReleaseId === RELEASE_ID, "AUDIT_RELEASE_MISMATCH");
  invariant(audit.candidate?.status === "prepared" && audit.releaseActivated === false, "AUDIT_MUST_BE_INACTIVE_PREPARED");

  const ownershipOutcomes = (audit.outcomes as Json[]).filter((outcome) =>
    (outcome.minimum?.professionalSourceMissingParameterIds?.length ?? 0) > 0
    || (outcome.minimum?.projectSpecificRefinementParameterIds?.length ?? 0) > 0);
  const definitionIds = ownershipOutcomes.map((outcome) => String(outcome.definitionVersionId));
  invariant(definitionIds.length > 0, "NO_SOURCE_OR_PROJECT_REFINEMENT_GAPS");

  const registry = JSON.parse(readFileSync(SOURCE_REGISTRY_PATH, "utf8")) as Json;
  const registryById = new Map<string, Json>((registry.sources as Json[]).map((source) => [
    String(source.source_id),
    source,
  ]));
  const primarySourceManifestBytes = existsSync(PRIMARY_SOURCE_MANIFEST_PATH)
    ? readFileSync(PRIMARY_SOURCE_MANIFEST_PATH, "utf8")
    : null;
  const primarySourceManifest = primarySourceManifestBytes == null
    ? null
    : JSON.parse(primarySourceManifestBytes) as Json;
  if (primarySourceManifest != null) {
    invariant(primarySourceManifest.candidateReleaseId === RELEASE_ID, "PRIMARY_SOURCE_MANIFEST_RELEASE_MISMATCH");
    invariant(primarySourceManifest.candidateReadOnly === true, "PRIMARY_SOURCE_MANIFEST_NOT_READ_ONLY");
  }
  const independentArtifactBySourceId = new Map<string, Json>((primarySourceManifest?.artifacts ?? []).map((artifact: Json) => {
    const sourceId = String(artifact.sourceId ?? "");
    const expectedSha256 = String(artifact.sha256 ?? "").toLowerCase();
    const artifactBytes = readFileSync(resolve(dirname(PRIMARY_SOURCE_MANIFEST_PATH), String(artifact.file ?? "")));
    invariant(/^[0-9a-f]{64}$/u.test(expectedSha256), `PRIMARY_SOURCE_SHA_INVALID:${sourceId}`);
    invariant(artifactBytes.length === Number(artifact.bytes), `PRIMARY_SOURCE_BYTES_MISMATCH:${sourceId}`);
    invariant(sha256(artifactBytes) === expectedSha256, `PRIMARY_SOURCE_SHA_MISMATCH:${sourceId}`);
    return [sourceId, artifact] as const;
  }));

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(
      `select status,activated_at from public.estimate_definition_release where id=$1`,
      [RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release?.activated_at == null, "RELEASE_MUST_REMAIN_PREPARED_AND_INACTIVE");

    const parameterRows = (await client.query(
      `select parameter.definition_version_id::text,parameter.parameter_id,
        parameter.title_ru,parameter.value_type,parameter.unit_id,parameter.truth_metadata,
        baseline.normative_source_ids
       from public.estimate_parameter_definition parameter
       join public.estimate_cumulative_manifest_entry manifest
         on manifest.release_id=$1 and manifest.definition_version_id=parameter.definition_version_id
       join public.estimate_approved_template_baseline baseline
         on baseline.id=manifest.approved_template_baseline_id
       where parameter.definition_version_id=any($2::uuid[])
       order by parameter.definition_version_id,parameter.ordinal`,
      [RELEASE_ID, definitionIds],
    )).rows as Json[];
    const parameterByDefinitionAndId = new Map(parameterRows.map((parameter) => [
      `${parameter.definition_version_id}\u0000${parameter.parameter_id}`,
      parameter,
    ]));
    const databaseSources = (await client.query(
      `select source_key,title_ru,authority,official_url,artifact_sha256,metadata
       from public.estimate_normative_source order by source_key`,
    )).rows as Json[];
    const databaseSourceByKey = new Map<string, Json>(databaseSources.map((source) => [
      String(source.source_key),
      source,
    ]));

    const occurrences = ownershipOutcomes.flatMap((outcome) => {
      const parameterIds = [...new Set([
        ...(outcome.minimum.professionalSourceMissingParameterIds ?? []),
        ...(outcome.minimum.projectSpecificRefinementParameterIds ?? []),
      ].map(String))];
      return parameterIds.map((parameterId) => {
        const parameter = parameterByDefinitionAndId.get(`${outcome.definitionVersionId}\u0000${parameterId}`);
        invariant(parameter != null, `PARAMETER_NOT_FOUND:${outcome.definitionVersionId}:${parameterId}`);
        const allDeclaredSourceIds = normalizeDeclaredSourceIds(parameter.normative_source_ids?.[parameterId]);
        const professionalSourceIds = allDeclaredSourceIds.filter(isProfessionalDeclaredSourceId);
        const sources: CatalogSourceRegistration[] = professionalSourceIds.map((sourceId) => {
          const databaseSource = databaseSourceByKey.get(sourceId);
          const registrySource = registryById.get(sourceId);
          const independentArtifact = independentArtifactBySourceId.get(sourceId);
          const officialUrl = String(databaseSource?.official_url
            ?? registrySource?.source_url_or_document_ref
            ?? independentArtifact?.officialUrl
            ?? "").trim();
          return {
            sourceId,
            databaseRegistered: databaseSource != null,
            officialUrl: officialUrl && officialUrl !== "unknown" ? officialUrl : null,
            artifactSha256: databaseSource?.artifact_sha256 == null
              ? null
              : String(databaseSource.artifact_sha256),
            registryReviewed: ["reviewed", "quantity_engineering_reviewed", "source_mapping_reviewed"]
              .includes(String(registrySource?.review_status ?? "")),
            registryPhysicalNormPack: registrySource?.is_source_backed_professional_norm_pack === true,
            useRestriction: databaseSource?.metadata?.useRestriction == null
              ? null
              : String(databaseSource.metadata.useRestriction),
            independentArtifactSha256: independentArtifact?.sha256 == null
              ? null
              : String(independentArtifact.sha256).toLowerCase(),
          };
        });
        const claimKind = isCatalogFirstEstimateProjectSpecificRefinementParameter(parameter)
          ? "PROJECT_SPECIFIC_REFINEMENT"
          : "MANAGED_PROFESSIONAL_SOURCE";
        const classification = classifyCatalogSourceGap(sources);
        return {
          catalogId: String(outcome.catalogId),
          titleRu: String(outcome.titleRu),
          domainId: String(outcome.domainId),
          sourceBatch: String(outcome.sourceBatch),
          definitionVersionId: String(outcome.definitionVersionId),
          parameterId,
          parameterTitleRu: String(parameter.title_ru ?? ""),
          valueType: String(parameter.value_type ?? ""),
          unitId: parameter.unit_id == null ? null : String(parameter.unit_id),
          valueSourceRole: String(parameter.truth_metadata?.value_source_role ?? ""),
          guideKind: String(parameter.truth_metadata?.guide?.guide_kind ?? ""),
          guideShortRu: String(parameter.truth_metadata?.guide?.guide_short_ru ?? ""),
          guideSnapshotSha256: parameter.truth_metadata?.guide?.source_snapshot_hash == null
            ? null
            : String(parameter.truth_metadata.guide.source_snapshot_hash),
          allDeclaredSourceIds,
          professionalSourceIds,
          sources,
          claimKind,
          classification,
          resolutionRoute: classifyCatalogGapResolutionRoute(claimKind, classification, sources),
          exactParameterRateBound: false,
        };
      });
    });

    const uniqueParameterClaims = [...new Map(occurrences.map((occurrence) => [
      `${occurrence.parameterId}\u0000${occurrence.classification}\u0000${occurrence.professionalSourceIds.join(",")}`,
      occurrence,
    ])).values()];
    const managedOccurrences = occurrences.filter((occurrence) =>
      occurrence.claimKind === "MANAGED_PROFESSIONAL_SOURCE");
    const projectOccurrences = occurrences.filter((occurrence) =>
      occurrence.claimKind === "PROJECT_SPECIFIC_REFINEMENT");
    const report = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      candidate: {
        definitionReleaseId: RELEASE_ID,
        status: "prepared",
        activatedAt: null,
      },
      inputAudit: {
        path: AUDIT_PATH.replaceAll("\\", "/"),
        sha256: sha256(auditBytes),
        receiptSha256: String(audit.receiptSha256),
      },
      primarySourceEvidence: primarySourceManifestBytes == null ? null : {
        path: PRIMARY_SOURCE_MANIFEST_PATH.replaceAll("\\", "/"),
        sha256: sha256(primarySourceManifestBytes),
        artifactCount: independentArtifactBySourceId.size,
        candidateReadOnly: true,
      },
      rules: [
        "A registered document or artifact is not an exact parameter-rate binding.",
        "An independently verified artifact still requires controlled registration and an exact applicable rate binding.",
        "Project inputs, drawings, PPR and validation fixtures are not professional norm sources.",
        "Managed professional-source occurrences remain platform gaps until an exact applicable claim is bound and traced.",
        "Project-specific refinement occurrences require the concrete project/PPR/QA evidence and are not universal norms.",
      ],
      counts: {
        worksWithManagedProfessionalSourceGap: new Set(managedOccurrences
          .map((occurrence) => occurrence.definitionVersionId)).size,
        worksWithProjectSpecificRefinement: new Set(projectOccurrences
          .map((occurrence) => occurrence.definitionVersionId)).size,
        parameterOccurrences: occurrences.length,
        uniqueParameterIds: new Set(occurrences.map((occurrence) => occurrence.parameterId)).size,
        uniqueParameterClaims: uniqueParameterClaims.length,
        byClassification: countBy(occurrences, (occurrence) => occurrence.classification),
        managedProfessionalSourceByClassification: countBy(
          managedOccurrences,
          (occurrence) => occurrence.classification,
        ),
        managedProfessionalSourceByResolutionRoute: countBy(
          managedOccurrences,
          (occurrence) => occurrence.resolutionRoute,
        ),
        projectSpecificRefinementByResolutionRoute: countBy(
          projectOccurrences,
          (occurrence) => occurrence.resolutionRoute,
        ),
        byClaimKind: countBy(occurrences, (occurrence) => occurrence.claimKind),
        managedProfessionalSourceOccurrencesByDomain: countBy(
          managedOccurrences,
          (occurrence) => occurrence.domainId,
        ),
        projectSpecificRefinementOccurrencesByDomain: countBy(
          projectOccurrences,
          (occurrence) => occurrence.domainId,
        ),
        bySourceBatch: countBy(ownershipOutcomes, (outcome) => String(outcome.sourceBatch)),
      },
      managedProfessionalSourceIds: countBy(
        managedOccurrences.flatMap((occurrence) => occurrence.professionalSourceIds),
        (sourceId) => sourceId,
      ),
      managedProfessionalParameterIds: countBy(managedOccurrences, (occurrence) => occurrence.parameterId),
      projectSpecificParameterIds: countBy(projectOccurrences, (occurrence) => occurrence.parameterId),
      occurrences,
    };
    const canonical = `${JSON.stringify(report, null, 2)}\n`;
    const reportSha256 = sha256(canonical);
    writeAtomic(resolve(OUTPUT_ROOT, "catalog-source-gap-ledger.json"), canonical);

    const classificationRows = Object.entries(report.counts.managedProfessionalSourceByClassification)
      .map(([classification, count]) => [classification, String(count)]);
    const resolutionRows = Object.entries(report.counts.managedProfessionalSourceByResolutionRoute)
      .map(([route, count]) => [route, String(count)]);
    const managedDomainRows = Object.entries(report.counts.managedProfessionalSourceOccurrencesByDomain)
      .map(([domain, count]) => [domain, String(count)]);
    const projectDomainRows = Object.entries(report.counts.projectSpecificRefinementOccurrencesByDomain)
      .map(([domain, count]) => [domain, String(count)]);
    const managedParameterRowsMarkdown = Object.entries(report.managedProfessionalParameterIds).slice(0, 30)
      .map(([parameterId, count]) => [parameterId, String(count)]);
    const projectParameterRowsMarkdown = Object.entries(report.projectSpecificParameterIds).slice(0, 30)
      .map(([parameterId, count]) => [parameterId, String(count)]);
    const markdown = [
      "# Catalog first-estimate source-gap ledger v1",
      "",
      `Prepared inactive release: \`${RELEASE_ID}\``,
      "",
      `Report SHA-256: \`${reportSha256}\``,
      "",
      `Managed-source works: **${report.counts.worksWithManagedProfessionalSourceGap}** · project-refinement works: **${report.counts.worksWithProjectSpecificRefinement}** · parameter occurrences: **${occurrences.length}**`,
      "",
      "A document being present does not prove an exact applicable rate. Managed-source rows remain platform-owned gaps.",
      "Project-specific refinement rows require the concrete project/PPR/QA evidence; they are tracked separately and are not universal norms.",
      "",
      "## Managed professional-source evidence state",
      "",
      markdownTable([["Classification", "Occurrences"], ...classificationRows]),
      "",
      "## Managed professional-source resolution route",
      "",
      markdownTable([["Required route", "Occurrences"], ...resolutionRows]),
      "",
      "## Managed professional-source occurrences by domain",
      "",
      markdownTable([["Domain", "Occurrences"], ...managedDomainRows]),
      "",
      "## Project-specific refinement occurrences by domain",
      "",
      markdownTable([["Domain", "Occurrences"], ...projectDomainRows]),
      "",
      "## Most repeated managed professional-source claims",
      "",
      markdownTable([["Parameter", "Occurrences"], ...managedParameterRowsMarkdown]),
      "",
      "## Most repeated project-specific refinement inputs",
      "",
      markdownTable([["Parameter", "Occurrences"], ...projectParameterRowsMarkdown]),
      "",
      "No activation, deployment or OTA was performed.",
      "",
    ].join("\n");
    writeAtomic(resolve(OUTPUT_ROOT, "catalog-source-gap-ledger.md"), markdown);
    writeAtomic(resolve(OUTPUT_ROOT, "catalog-source-gap-ledger.sha256"), `${reportSha256}  catalog-source-gap-ledger.json\n`);
    process.stdout.write(`${JSON.stringify({
      outputRoot: OUTPUT_ROOT,
      reportSha256,
      counts: report.counts,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
