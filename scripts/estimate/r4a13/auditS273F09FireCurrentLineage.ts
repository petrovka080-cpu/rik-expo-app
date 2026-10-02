import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";

type Json = Record<string, unknown>;

const CONTRACT = "rik-expo-app.s27-3.f09-fire-current-lineage-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const CURRENT_RELEASE = JSON.parse(
  readFileSync(CURRENT_RELEASE_PATH, "utf8"),
) as { definitionReleaseId?: unknown };
const RELEASE_ID = process.env.S273_F09_RELEASE_ID
  ?? String(CURRENT_RELEASE.definitionReleaseId ?? "");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const OUTPUT_PATH = resolve(
  process.env.S273_F09_INVENTORY_OUTPUT_PATH
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/01_inventory.json",
);
const GAP_LEDGER_PATH = resolve(
  process.env.S273_F09_GAP_LEDGER_OUTPUT_PATH
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/02_source_composition_gap_ledger.json",
);
const GENERIC_DEFAULT_SOURCE_BATCH =
  "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const FIRE_EXPANDED_FAMILIES = new Set([
  "fire_alarm_system",
  "sprinkler_system",
  "fire_fighting_pump_station",
  "fire_hydrants",
  "smoke_exhaust_system",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(stable(value), null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .normalize("NFKC")
    .replace(/[ё]/gu, "е")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .trim();
}

function isFireIdentity(row: {
  catalog_id: string;
  domain_id: string;
  primary_material_or_system: string;
  title_ru: string;
}): boolean {
  const identity = normalize(
    `${row.catalog_id} ${row.primary_material_or_system} ${row.title_ru}`,
  );
  if (row.domain_id === "electrical" && identity.includes("fire alarm")) return true;
  if (row.domain_id === "special_repair" && identity.includes("fireproof")) return true;
  return row.domain_id.startsWith("expanded:")
    && FIRE_EXPANDED_FAMILIES.has(row.domain_id.slice("expanded:".length));
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(
    ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S273_F09_DATABASE_NOT_LOOPBACK:${parsed.hostname}`,
  );
  invariant(
    parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S273_F09_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`,
  );
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  return Object.fromEntries(
    [...rows.reduce((counts, row) => {
      const value = key(row);
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S273_F09_WRONG_BRANCH");

  const inventory = buildGlobalCatalogInventoryV1();
  invariant(inventory.rows.length === 11_610, `STOP_S273_F09_GLOBAL_DENOMINATOR:${inventory.rows.length}`);
  const fireRows = inventory.rows.filter(isFireIdentity);
  invariant(fireRows.length === 88, `STOP_S273_F09_FIRE_DENOMINATOR:${fireRows.length}`);
  const canonicalMappings = fireRows.map((row) => ({
    sourceCatalogId: row.catalog_id,
    canonicalCatalogId: row.domain_id.startsWith("expanded:")
      ? `canonical-work:expanded:${row.domain_id.slice("expanded:".length)}`
      : `canonical-work:base:${row.catalog_id}`,
  }));
  const fireIds = [...new Set(canonicalMappings.map((row) => row.canonicalCatalogId))].sort();
  invariant(fireIds.length === 68, `STOP_S273_F09_CANONICAL_FIRE_DENOMINATOR:${fireIds.length}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query<{
      id: string;
      release_key: string;
      status: string;
      definition_count: number;
      parent_release_id: string | null;
    }>(`select id::text, release_key, status, definition_count, parent_release_id::text
        from public.estimate_definition_release where id=$1::uuid`, [RELEASE_ID])).rows[0];
    invariant(release, "STOP_S273_F09_RELEASE_MISSING");
    invariant(release.status === "prepared", `STOP_S273_F09_RELEASE_STATUS:${release.status}`);

    const rows = (await client.query<{
      catalog_id: string;
      definition_version_id: string;
      source_batch: string;
      domain_id: string;
      baseline_ready: boolean;
      scenario_ready: boolean;
      runtime_publication_state: string;
      publication_state: string;
      content_status: string;
      content_gate_status: string;
      parameter_count: number;
      formula_count: number;
      resource_count: number;
      content_passport_count: number;
      accepted_technology_passport_count: number;
      normative_binding_count: number;
      normative_source_count: number;
      artifact_backed_source_count: number;
    }>(`select manifest.catalog_id,
          manifest.definition_version_id::text,
          manifest.source_batch,
          manifest.domain_id,
          manifest.baseline_ready,
          manifest.scenario_ready,
          manifest.runtime_publication_state,
          manifest.publication_state,
          definition.content_status,
          definition.content_gate_status,
          (select count(*)::int from public.estimate_parameter_definition parameter
            where parameter.definition_version_id=manifest.definition_version_id) parameter_count,
          (select count(*)::int from public.estimate_formula_graph formula
            where formula.definition_version_id=manifest.definition_version_id) formula_count,
          (select count(*)::int from public.estimate_resource_spec resource
            where resource.definition_version_id=manifest.definition_version_id) resource_count,
          (select count(*)::int from public.estimate_content_passport_r3 passport
            where passport.definition_version_id=manifest.definition_version_id) content_passport_count,
          case when public.estimate_technology_passport_any_exact_accepted_r3(
            manifest.definition_version_id
          ) then 1 else 0 end accepted_technology_passport_count,
          (select count(*)::int from public.estimate_work_normative_binding binding
            where binding.definition_version_id=manifest.definition_version_id) normative_binding_count,
          (select count(distinct locator.source_id)::int
            from public.estimate_work_normative_binding binding
            join public.estimate_normative_locator locator on locator.id=binding.locator_id
            where binding.definition_version_id=manifest.definition_version_id) normative_source_count,
          (select count(distinct source.id)::int
            from public.estimate_work_normative_binding binding
            join public.estimate_normative_locator locator on locator.id=binding.locator_id
            join public.estimate_normative_source source on source.id=locator.source_id
            where binding.definition_version_id=manifest.definition_version_id
              and source.artifact_sha256 is not null
              and locator.excerpt_sha256 is not null) artifact_backed_source_count
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition
          on definition.id=manifest.definition_version_id
        where manifest.release_id=$1::uuid and manifest.catalog_id=any($2::text[])
        order by manifest.catalog_id`, [RELEASE_ID, fireIds])).rows;

    const foundIds = new Set(rows.map((row) => row.catalog_id));
    const missingCatalogIds = fireIds.filter((catalogId) => !foundIds.has(catalogId));
    const genericRows = rows.filter((row) => row.source_batch === GENERIC_DEFAULT_SOURCE_BATCH);
    const successorRows = rows.filter((row) => row.source_batch !== GENERIC_DEFAULT_SOURCE_BATCH);
    const contentPassportCount = rows.filter((row) => row.content_passport_count > 0).length;
    const humanAcceptedCount = rows.filter((row) => row.accepted_technology_passport_count > 0).length;

    const resources = (await client.query<{
      catalog_id: string;
      ordinal: number;
      row_type: string;
      category: string;
      title_ru: string;
      unit_id: string;
      expression_source: string;
      source_metadata: Json;
    }>(`select manifest.catalog_id,
          resource.ordinal,
          resource.row_type,
          resource.category,
          resource.title_ru,
          resource.unit_id,
          formula.expression_source,
          resource.source_metadata
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_resource_spec resource
          on resource.definition_version_id=manifest.definition_version_id
        join public.estimate_formula_graph formula
          on formula.definition_version_id=resource.definition_version_id
          and formula.formula_id=resource.formula_id
        where manifest.release_id=$1::uuid and manifest.catalog_id=any($2::text[])
        order by manifest.catalog_id,resource.ordinal`, [RELEASE_ID, fireIds])).rows;

    const forbiddenTitleTokens = new Map<string, string[]>([
      ["canonical-work:expanded:fire_alarm_system", [
        "отоплен", "радиатор", "котел", "канализац", "воздуховод", "вентилятор",
      ]],
      ["canonical-work:expanded:fire_fighting_pump_station", [
        "отоплен", "радиатор", "котел", "канализац", "воздуховод", "вентилятор",
      ]],
      ["canonical-work:expanded:fire_hydrants", [
        "отоплен", "радиатор", "котел", "канализац", "воздуховод", "вентилятор",
      ]],
      ["canonical-work:expanded:smoke_exhaust_system", [
        "отоплен", "радиатор", "котел", "канализац", "спринклер", "гидрант",
      ]],
    ]);
    const gapLedger = genericRows.map((definition) => {
      const definitionResources = resources.filter((resource) =>
        resource.catalog_id === definition.catalog_id);
      const forbidden = forbiddenTitleTokens.get(definition.catalog_id) ?? [];
      const apparentCrossSystemTitles = definitionResources
        .filter((resource) => forbidden.some((token) =>
          normalize(resource.title_ru).includes(token)))
        .map((resource) => resource.title_ru);
      const inlineTraceWithoutBinding = definitionResources.filter((resource) =>
        Array.isArray(resource.source_metadata.normativeTrace)
        && resource.source_metadata.normativeTrace.length > 0).length;
      return {
        catalogId: definition.catalog_id,
        domainId: definition.domain_id,
        definitionVersionId: definition.definition_version_id,
        resourceCount: definitionResources.length,
        rowTypeCounts: countBy(definitionResources, (resource) => resource.row_type),
        compositionSha256: sha256(definitionResources.map((resource) => ({
          ordinal: resource.ordinal,
          rowType: resource.row_type,
          category: resource.category,
          titleRu: resource.title_ru,
          unitId: resource.unit_id,
          expressionSource: resource.expression_source,
        }))),
        durableNormativeBindingCount: definition.normative_binding_count,
        inlineNormativeTraceWithoutDurableBindingCount: inlineTraceWithoutBinding,
        apparentCrossSystemTitles,
        dispositions: [
          ...(definition.normative_binding_count === 0 ? ["SOURCE_GAP"] : []),
          ...(inlineTraceWithoutBinding > 0
            ? ["INLINE_TRACE_WITHOUT_DURABLE_NORMATIVE_BINDING"]
            : []),
          ...(apparentCrossSystemTitles.length > 0
            ? ["COMPOSITION_APPLICABILITY_GAP"]
            : []),
        ],
      };
    });
    invariant(
      gapLedger.length === fireIds.length - successorRows.length,
      `STOP_S273_F09_GENERIC_LEDGER:${gapLedger.length}:${successorRows.length}`,
    );

    const report = {
      schemaVersion: CONTRACT,
      generatedAtUtc: new Date().toISOString(),
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        currentReleasePath: CURRENT_RELEASE_PATH,
        releaseIdSource: process.env.S273_F09_RELEASE_ID
          ? "S273_F09_RELEASE_ID"
          : "CURRENT_RELEASE_POINTER",
        denominator: 11_610,
        sourceFireSelectionSha256: sha256(fireRows.map((row) => row.catalog_id).sort()),
        canonicalFireSelectionSha256: sha256(fireIds),
      },
      release,
      fireFamily: {
        expectedGlobalCatalogRows: fireRows.length,
        expectedCanonicalCatalogIds: fireIds.length,
        foundInCurrentManifest: rows.length,
        missingCanonicalCatalogIds: missingCatalogIds,
        sourceToCanonicalMappingSha256: sha256(canonicalMappings),
        domainCounts: countBy(fireRows, (row) => row.domain_id),
        sourceBatchCounts: countBy(rows, (row) => row.source_batch),
        genericDefaultBindingCount: genericRows.length,
        genericDefaultCatalogIds: genericRows.map((row) => row.catalog_id),
        sourceBackedSuccessorCount: successorRows.length,
        sourceBackedSuccessorCatalogIds: successorRows.map((row) => row.catalog_id),
        contentPassportCount,
        humanAcceptedTechnologyPassportCount: humanAcceptedCount,
        definitionsWithNormativeBindings: rows.filter((row) => row.normative_binding_count > 0).length,
        definitionsWithArtifactBackedSources: rows.filter((row) => row.artifact_backed_source_count > 0).length,
        genericDefinitionsWithoutNormativeBindings: genericRows
          .filter((row) => row.normative_binding_count === 0)
          .map((row) => row.catalog_id),
        normativeBindingTotal: rows.reduce((sum, row) => sum + row.normative_binding_count, 0),
        normativeSourceReferenceTotal: rows.reduce((sum, row) => sum + row.normative_source_count, 0),
        readinessCounts: countBy(rows, (row) =>
          `${row.content_status}|${row.content_gate_status}|baseline=${row.baseline_ready}|scenario=${row.scenario_ready}`),
        runtimePublicationCounts: countBy(rows, (row) =>
          `${row.publication_state}|${row.runtime_publication_state}`),
        resourceDepth: {
          minimum: rows.length > 0 ? Math.min(...rows.map((row) => row.resource_count)) : null,
          maximum: rows.length > 0 ? Math.max(...rows.map((row) => row.resource_count)) : null,
          total: rows.reduce((sum, row) => sum + row.resource_count, 0),
        },
        parameterTotal: rows.reduce((sum, row) => sum + row.parameter_count, 0),
        formulaTotal: rows.reduce((sum, row) => sum + row.formula_count, 0),
      },
      decision: {
        nextFamily: "fire_life_safety",
        historicalBatch009ReusableAsCurrentProof: false,
        reason: `The historical BATCH009 package is absent from the current release lineage and the manifest forbids BATCH009 source ownership. The 88 global fire rows map to 68 canonical identities; ${genericRows.length} generic definitions remain after ${successorRows.length} focused current-lineage successors and still require claim-by-claim source and composition work.`,
        databaseWrites: 0,
        productionAccessed: false,
      },
      status: missingCatalogIds.length === 0
        ? "GREEN_S27_3_F09_FIRE_CURRENT_LINEAGE_INVENTORY"
        : "RED_S27_3_F09_FIRE_CURRENT_LINEAGE_INVENTORY_MISSING_IDS",
    };
    atomicJson(OUTPUT_PATH, report);
    atomicJson(GAP_LEDGER_PATH, {
      schemaVersion: "rik-expo-app.s27-3.f09-fire-source-composition-gap-ledger.v1",
      generatedAtUtc: report.generatedAtUtc,
      releaseId: RELEASE_ID,
      canonicalFireIdentityCount: fireIds.length,
      genericDefinitionCount: genericRows.length,
      sourceGapCount: gapLedger.filter((row) => row.dispositions.includes("SOURCE_GAP")).length,
      inlineTraceWithoutDurableBindingCount: gapLedger.filter((row) =>
        row.dispositions.includes("INLINE_TRACE_WITHOUT_DURABLE_NORMATIVE_BINDING")).length,
      apparentCrossSystemCompositionGapCount: gapLedger.filter((row) =>
        row.dispositions.includes("COMPOSITION_APPLICABILITY_GAP")).length,
      definitions: gapLedger,
      databaseWrites: 0,
      productionAccessed: false,
      status: "GREEN_S27_3_F09_FIRE_GAPS_ENUMERATED_NOT_RESOLVED",
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    invariant(missingCatalogIds.length === 0, `STOP_S273_F09_FIRE_IDS_MISSING:${missingCatalogIds.length}`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
