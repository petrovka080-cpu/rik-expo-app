import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-useful-estimates-batch001-008-r1.before-runtime-composition.v1";
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SELECTION = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_SELECTION_MANIFEST.json");
const SOURCE_IDENTITY = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/01_SOURCE_IDENTITY.json");
const OUTPUT_ROOT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/runtime-snapshots");
const REVISION_BINDING_MANIFEST = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_REVISION_BINDING_MANIFEST.json",
);
const DATABASE_URL = process.env.REAL_USEFUL_BEFORE_DATABASE_URL;
const RELEASE_ID = process.env.REAL_USEFUL_BEFORE_RELEASE_ID ?? "b28fdda9-e55f-4629-bba8-24ff15e7d8b6";
const EXPECTED_DATABASE = process.env.REAL_USEFUL_BEFORE_EXPECTED_DATABASE ?? "before_batch004";
const EXPECTED_FOUND = Number(process.env.REAL_USEFUL_BEFORE_EXPECTED_FOUND ?? "5");
const EXPECTED_DEFINITIONS = Number(process.env.REAL_USEFUL_BEFORE_EXPECTED_DEFINITIONS ?? "393");
const SNAPSHOT_ID = (process.env.REAL_USEFUL_BEFORE_SNAPSHOT_ID ?? "BATCH004").replace(/[^A-Z0-9_-]+/giu, "_");
const DATABASE_SOURCE_DUMP = resolve(
  process.env.REAL_USEFUL_BEFORE_SOURCE_DUMP
    ?? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/android/batch004-r56-post-android-green.dump",
);
const EXPECTED_SOURCE_DUMP_SHA256 = process.env.REAL_USEFUL_BEFORE_SOURCE_DUMP_SHA256
  ?? "f6dee47f6503fc1d8ad2d58a844cb0d017fe9621775ae700be5e06c75e9ce404";

const GENERIC_TITLE = /(?:\bсовместим|\bедин(?:ая|ый|ое|ые)\b|\bподтвержд[её]нн|по проектному ппр|для выполнения|оборудование доступа|работа механизма|комплект материалов|прочие материалы|локальн\w* конструкц|профиль усиления)/iu;
const INTERNAL_PUBLIC_TERM = /(?:\bbackend\b|\brevision\b|\brelease\b|\bbatch[-_ ]?\d*\b|\bcanonical\b|\bartifact\b|semantic owner|cost owner|formula graph|child revision)/iu;
const SPECIFICATION_SIGNAL = /(?:\d+(?:[.,]\d+)?\s*(?:мм|см|м\b|кг|г\/м|м²|м2|квт|т\b|л\b)|[Øø]\s*\d|\b(?:ГКЛВ|ГКЛО|A500C|A240|B\d{1,2}|W\d|F\d{2,3}|SDR\d+|DN\d+|PN\d+|IP\d{2}|CW\s*\d|UW\s*\d|UA\s*\d|ВВГнг|ПЭ100)\b)/iu;
const RAW_PUBLIC_UNIT = new Set(["t_km", "worker_h", "machine_h", "shift", "item", "piece", "set"]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function fileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/gu, "_").slice(0, 180);
}

function objectText(value: unknown): string {
  return JSON.stringify(value ?? {}).toLocaleLowerCase("ru-RU");
}

function changedInputKeys(parent: Json, child: Json): string[] {
  const left = parent.input_parameters ?? {};
  const right = child.input_parameters ?? {};
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .sort();
}

function summarizeChildRevision(parent: Json, child: Json): Json {
  const rowOverrides = child.amendment_contract?.rowOverrides ?? {};
  const customRows = child.amendment_contract?.customRows ?? [];
  const inputKeys = changedInputKeys(parent, child);
  const reasons = [
    ...(inputKeys.length > 0 ? [`TEST_PARAMETER_CHANGE:${inputKeys.join(",")}`] : []),
    ...(Object.keys(rowOverrides).length > 0 ? [`TEST_ROW_OVERRIDE:${Object.keys(rowOverrides).join(",")}`] : []),
    ...(customRows.length > 0 ? [`TEST_CUSTOM_ROWS:${customRows.length}`] : []),
  ];
  return {
    revision_id: child.id,
    revision_number: child.revision_number,
    parent_revision_id: child.parent_revision_id,
    definition_version_id: child.definition_version_id,
    definition_version: child.definition_version,
    release_id: child.release_id,
    row_count: child.row_count,
    input_hash: child.input_hash,
    output_hash: child.output_hash,
    checksum_sha256: child.checksum_sha256,
    input_parameters: child.input_parameters,
    changed_input_keys: inputKeys,
    row_overrides: rowOverrides,
    row_override_ids: Object.keys(rowOverrides).sort(),
    custom_rows: customRows,
    custom_row_count: customRows.length,
    exclusion_reasons_from_before_composition: reasons.length > 0 ? reasons : ["DESCENDANT_OF_CANONICAL_PARENT"],
  };
}

function contentSignals(rows: readonly Json[], specs: readonly Json[]): Json {
  const specById = new Map(specs.map((spec) => [String(spec.id), spec]));
  const materials = rows.filter((row) => String(row.category) === "material");
  const equipment = rows.filter((row) => String(row.category) === "machine_equipment");
  const delivery = rows.filter((row) => String(row.category) === "delivery");
  const all = rows.map((row) => ({ row, spec: specById.get(String(row.resource_spec_id)) ?? {} }));
  const genericRows = all.filter(({ row }) => GENERIC_TITLE.test(String(row.title_ru)));
  const internalTermRows = all.filter(({ row }) => INTERNAL_PUBLIC_TERM.test(String(row.title_ru)));
  const materialSpecificationMissing = materials.filter((row) => {
    const spec = specById.get(String(row.resource_spec_id)) ?? {};
    const source = `${row.title_ru ?? ""} ${objectText(spec.source_metadata)} ${objectText(spec.resource_graph)}`;
    return !SPECIFICATION_SIGNAL.test(source);
  });
  const purposeMissing = materials.filter((row) => {
    const spec = specById.get(String(row.resource_spec_id)) ?? {};
    return !/(purpose|назначени|application|применени)/iu.test(`${objectText(spec.source_metadata)} ${objectText(spec.resource_graph)}`);
  });
  const stageMissing = materials.filter((row) => {
    const spec = specById.get(String(row.resource_spec_id)) ?? {};
    return !/(technology_stage|technologystage|stage_id|stageid|этап)/iu.test(
      `${objectText(spec.source_metadata)} ${objectText(spec.resource_graph)}`,
    );
  });
  const packagingMissing = materials.filter((row) => row.procurement_eligible === true && !/(packag|упаков|мешок|рулон|бухт|пачк)/iu.test(
    `${row.title_ru ?? ""} ${objectText(row.calculation_trace)} ${objectText(specById.get(String(row.resource_spec_id)))}`,
  ));
  const lossBasisMissing = materials.filter((row) => !/(loss|waste_percent|потер|запас|раскрой)/iu.test(
    `${objectText(row.calculation_trace)} ${objectText(specById.get(String(row.resource_spec_id)))}`,
  ));
  const procurementRoundingMissing = materials.filter((row) => row.procurement_eligible === true && !/(?:"(?:procurementquantity|procurement_quantity|roundingrule|rounding_rule)"|\bceil\s*\(|закупочн\w* количеств|округлен|округлён)/iu.test(
    `${objectText(row.calculation_trace)} ${objectText(specById.get(String(row.resource_spec_id)))}`,
  ));
  const equipmentCharacteristicMissing = equipment.filter((row) => !SPECIFICATION_SIGNAL.test(String(row.title_ru)));
  const deliveryGeneric = delivery.filter((row) => GENERIC_TITLE.test(String(row.title_ru))
    || !/(автомоб|самосвал|автобетоносмес|бортов|транспорт|рейс|кран-манипулятор)/iu.test(String(row.title_ru)));
  const formulaMissing = all.filter(({ row, spec }) => !row.calculation_trace?.formulaId || !spec.formula_id);
  const quantityMissingOrZero = rows.filter((row) => !(Number(row.quantity) > 0));
  const rawUnits = rows.filter((row) => RAW_PUBLIC_UNIT.has(String(row.unit_id).toLocaleLowerCase("ru-RU")));
  const blockerCodes = [
    ...genericRows.map(({ row }) => `GENERIC_TITLE:${row.row_id}`),
    ...internalTermRows.map(({ row }) => `INTERNAL_PUBLIC_TERM:${row.row_id}`),
    ...materialSpecificationMissing.map((row) => `MATERIAL_SPECIFICATION_MISSING:${row.row_id}`),
    ...purposeMissing.map((row) => `MATERIAL_PURPOSE_MISSING:${row.row_id}`),
    ...stageMissing.map((row) => `MATERIAL_STAGE_MISSING:${row.row_id}`),
    ...packagingMissing.map((row) => `MATERIAL_PACKAGING_MISSING:${row.row_id}`),
    ...lossBasisMissing.map((row) => `MATERIAL_LOSS_BASIS_MISSING:${row.row_id}`),
    ...procurementRoundingMissing.map((row) => `PROCUREMENT_ROUNDING_MISSING:${row.row_id}`),
    ...equipmentCharacteristicMissing.map((row) => `EQUIPMENT_CHARACTERISTIC_MISSING:${row.row_id}`),
    ...deliveryGeneric.map((row) => `GENERIC_DELIVERY:${row.row_id}`),
    ...formulaMissing.map(({ row }) => `FORMULA_MISSING:${row.row_id}`),
    ...quantityMissingOrZero.map((row) => `QUANTITY_MISSING_OR_ZERO:${row.row_id}`),
    ...rawUnits.map((row) => `RAW_PUBLIC_UNIT:${row.row_id}:${row.unit_id}`),
    "INDEPENDENT_TECHNOLOGY_PASSPORT_R1_MISSING",
  ];
  return {
    counters: {
      rows_total: rows.length,
      material_rows: materials.length,
      construction_work_rows: rows.filter((row) => String(row.category) === "construction_work").length,
      equipment_rows: equipment.length,
      delivery_rows: delivery.length,
      generic_title_rows: genericRows.length,
      internal_public_term_rows: internalTermRows.length,
      material_specification_missing: materialSpecificationMissing.length,
      material_purpose_missing: purposeMissing.length,
      material_stage_missing: stageMissing.length,
      material_packaging_missing: packagingMissing.length,
      unexplained_loss_or_reserve: lossBasisMissing.length,
      procurement_rounding_missing: procurementRoundingMissing.length,
      equipment_characteristic_missing: equipmentCharacteristicMissing.length,
      generic_delivery_rows: deliveryGeneric.length,
      formula_missing: formulaMissing.length,
      quantity_missing_or_zero: quantityMissingOrZero.length,
      raw_public_units: rawUnits.length,
      independent_technology_passport_present: false,
    },
    blocker_codes: [...new Set(blockerCodes)].sort(),
    ordinary_user_verdict: blockerCodes.length === 0 ? "GREEN" : "RED",
    estimator_verdict: blockerCodes.length === 0 ? "GREEN" : "RED",
    engineer_verdict: "RED",
    overall: "RED",
  };
}

async function main(): Promise<void> {
  invariant(DATABASE_URL, "REAL_USEFUL_BEFORE_DATABASE_URL_REQUIRED");
  const selection = readJson(SELECTION);
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  invariant(selection.master_contract?.sha256 === MASTER_SHA256, "BEFORE_RUNTIME_SELECTION_MASTER_DRIFT");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "BEFORE_RUNTIME_SOURCE_MASTER_DRIFT");
  invariant(selection.denominators?.total === 50 && selection.denominators?.distinct_catalog_ids === 50,
    "BEFORE_RUNTIME_SELECTION_DENOMINATOR_RED");
  invariant(hashFile(DATABASE_SOURCE_DUMP) === EXPECTED_SOURCE_DUMP_SHA256,
    "BEFORE_RUNTIME_SOURCE_DUMP_DRIFT");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "real-useful-before-runtime-readonly-r1" });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const identity = (await client.query<Json>(`
      select current_database() database_name,
        current_setting('server_version') server_version,
        (select count(*)::int from public.estimate_definition_version) definitions,
        (select count(*)::int from public.estimate_revision) revisions,
        (select count(*)::int from public.estimate_revision_row) revision_rows,
        (select count(*)::int from public.estimate_compile_job where status='failed') failed_jobs
    `)).rows[0]!;
    invariant(identity.database_name === EXPECTED_DATABASE, `BEFORE_RUNTIME_DATABASE_IDENTITY:${identity.database_name}`);
    invariant(identity.definitions === EXPECTED_DEFINITIONS && identity.failed_jobs === 0, "BEFORE_RUNTIME_DATABASE_COUNTS_RED");
    const release = (await client.query<Json>(
      "select id::text,release_key,status,source_commit,source_tree,source_manifest_sha256,source_package_sha256,activated_at from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "BEFORE_RUNTIME_RELEASE_NOT_PREPARED");

    const catalogIds = (selection.selections as Json[]).map((entry) => String(entry.catalog_id));
    const revisionRows = (await client.query<Json>(`
      select * from public.estimate_revision
      where release_id=$1 and catalog_id=any($2::text[])
      order by catalog_id,revision_number,created_at
    `, [RELEASE_ID, catalogIds])).rows;
    const revisionChains = new Map<string, Json[]>();
    for (const revision of revisionRows) {
      const catalogId = String(revision.catalog_id);
      revisionChains.set(catalogId, [...(revisionChains.get(catalogId) ?? []), revision]);
    }
    invariant(revisionChains.size === EXPECTED_FOUND, `BEFORE_RUNTIME_FOUND_DENOMINATOR:${revisionChains.size}`);
    const revisionByCatalog = new Map<string, { parent: Json; children: Json[] }>();
    for (const [catalogId, chain] of revisionChains) {
      const roots = chain.filter((revision) => revision.parent_revision_id == null);
      invariant(roots.length === 1, `BEFORE_RUNTIME_CANONICAL_PARENT_DENOMINATOR:${catalogId}:${roots.length}`);
      const parent = roots[0]!;
      const childById = new Map(chain.map((revision) => [String(revision.id), revision]));
      const reachesRoot = (revision: Json): boolean => {
        const visited = new Set<string>();
        let cursor: Json | undefined = revision;
        while (cursor?.parent_revision_id != null) {
          if (visited.has(String(cursor.id))) return false;
          visited.add(String(cursor.id));
          cursor = childById.get(String(cursor.parent_revision_id));
        }
        return cursor?.id === parent.id;
      };
      const children = chain.filter((revision) => revision.id !== parent.id);
      invariant(children.every(reachesRoot), `BEFORE_RUNTIME_CHILD_CHAIN_RED:${catalogId}`);
      revisionByCatalog.set(catalogId, { parent, children });
    }
    const outputs: Json[] = [];
    const revisionBindings: Json[] = [];

    for (const selected of selection.selections as Json[]) {
      const chain = revisionByCatalog.get(String(selected.catalog_id));
      if (!chain) continue;
      const revision = chain.parent;
      // A single repeatable-read connection is intentionally sequential: concurrent
      // client.query calls can escape the evidence ordering guarantees in future pg versions.
      const definition = await client.query<Json>(
        "select * from public.estimate_definition_version where id=$1", [revision.definition_version_id],
      );
      const rows = await client.query<Json>(
        "select * from public.estimate_revision_row where revision_id=$1 order by ordinal", [revision.id],
      );
      const specs = await client.query<Json>(
        "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [revision.definition_version_id],
      );
      const parameters = await client.query<Json>(
        "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [revision.definition_version_id],
      );
      const formulas = await client.query<Json>(
        "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [revision.definition_version_id],
      );
      const artifacts = await client.query<Json>(
        "select * from public.estimate_revision_artifact where revision_id=$1 order by artifact_kind", [revision.id],
      );
      const chainArtifacts = await client.query<Json>(
        `select * from public.estimate_revision_artifact
         where revision_id=any($1::uuid[]) order by revision_id,artifact_kind`,
        [[revision.id, ...chain.children.map((child) => child.id)]],
      );
      const manifest = await client.query<Json>(
        "select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2",
        [RELEASE_ID, revision.catalog_id],
      );
      invariant(definition.rows.length === 1 && manifest.rows.length === 1, `BEFORE_RUNTIME_DEFINITION_JOIN_RED:${revision.catalog_id}`);
      invariant(revision.parent_revision_id == null && Number(revision.revision_number) === 1,
        `BEFORE_RUNTIME_SELECTED_REVISION_NOT_ROOT_PARENT:${revision.catalog_id}`);
      invariant(String(revision.release_id) === String(RELEASE_ID), `BEFORE_RUNTIME_PARENT_RELEASE_DRIFT:${revision.catalog_id}`);
      invariant(String(definition.rows[0]!.id) === String(revision.definition_version_id),
        `BEFORE_RUNTIME_PARENT_DEFINITION_VERSION_DRIFT:${revision.catalog_id}`);
      invariant(rows.rows.length === Number(revision.row_count), `BEFORE_RUNTIME_ROW_COUNT_RED:${revision.catalog_id}`);
      const specificationIds = new Set(specs.rows.map((specification) => String(specification.id)));
      invariant(rows.rows.every((row) => specificationIds.has(String(row.resource_spec_id))),
        `BEFORE_RUNTIME_ROW_SPECIFICATION_JOIN_RED:${revision.catalog_id}`);
      const contentAudit = contentSignals(rows.rows, specs.rows);
      const childRevisions = chain.children.map((child) => {
        const directParent = revisionRows.find((candidate) => String(candidate.id) === String(child.parent_revision_id));
        invariant(directParent, `BEFORE_RUNTIME_CHILD_PARENT_MISSING:${child.id}`);
        return summarizeChildRevision(directParent, child);
      });
      const childRevisionArtifacts = chain.children.map((child) => ({
        revision_id: child.id,
        parent_revision_id: child.parent_revision_id,
        revision_number: child.revision_number,
        artifacts: chainArtifacts.rows.filter((artifact) => String(artifact.revision_id) === String(child.id)),
      }));
      const requiredScenarioRevision = String(selected.catalog_id)
        === "drywall_ceiling_interior_moisture_partition_repair_technical_room"
        ? chain.children.find((child) => Number(child.input_parameters?.defect_area_m2) === 19.25
          && Object.keys(child.amendment_contract?.rowOverrides ?? {}).length === 0)
        : undefined;
      if (String(selected.catalog_id) === "drywall_ceiling_interior_moisture_partition_repair_technical_room") {
        invariant(requiredScenarioRevision, "BEFORE_RUNTIME_REQUIRED_19_25_SCENARIO_REVISION_MISSING");
      }
      const revisionBinding = {
        ordinal: selected.ordinal,
        batch_id: selected.batch_id,
        catalog_id: selected.catalog_id,
        release_id: revision.release_id,
        prepared_release_status: release.status,
        authoritative_audit_definition_version_id: selected.definition_version_id,
        authoritative_audit_definition_sha256: selected.definition_sha256,
        runtime_definition_version_id: revision.definition_version_id,
        runtime_definition_version: revision.definition_version,
        canonical_parent_revision_id: revision.id,
        canonical_parent_revision_number: revision.revision_number,
        canonical_parent_parent_revision_id: revision.parent_revision_id,
        selection_reason: "ROOT_CANONICAL_PARENT_OF_ACCEPTED_FUNCTIONAL_CHAIN_PARENT_REVISION_ID_NULL",
        child_revisions: childRevisions,
        child_revision_artifacts: childRevisionArtifacts,
        child_revision_count: childRevisions.length,
        required_scenario_binding: requiredScenarioRevision ? {
          role: "REQUIRED_19_25_M2_CONDITIONAL_SCENARIO_NOT_PRIMARY_BEFORE_PARENT",
          revision_id: requiredScenarioRevision.id,
          parent_revision_id: requiredScenarioRevision.parent_revision_id,
          release_id: requiredScenarioRevision.release_id,
          definition_version_id: requiredScenarioRevision.definition_version_id,
          physical_input: { defect_area_m2: requiredScenarioRevision.input_parameters?.defect_area_m2 },
          exclusion_from_primary_before_reason: "USER_PARAMETER_CHILD_MUST_NOT_REPLACE_ROOT_CANONICAL_PARENT",
        } : null,
        source_dump: {
          path: DATABASE_SOURCE_DUMP.replaceAll("\\", "/"),
          sha256: hashFile(DATABASE_SOURCE_DUMP),
        },
      };
      const payload = {
        schema_version: CONTRACT,
        generated_at: new Date().toISOString(),
        master_sha256: MASTER_SHA256,
        selection: selected,
        source_identity: {
          head: sourceIdentity.git?.head,
          tree: sourceIdentity.git?.tree,
          app_source_state_id: sourceIdentity.accepted_before_source?.app_source_state_id,
          harness_state_id: sourceIdentity.accepted_before_source?.harness_state_id,
          apk_sha256: sourceIdentity.accepted_before_source?.apk_sha256,
        },
        selection_manifest_sha256: hashFile(SELECTION),
        database: identity,
        source_dump: {
          path: DATABASE_SOURCE_DUMP.replaceAll("\\", "/"),
          sha256: hashFile(DATABASE_SOURCE_DUMP),
        },
        release,
        manifest: manifest.rows[0],
        definition: definition.rows[0],
        revision_binding: revisionBinding,
        revision,
        child_revisions: childRevisions,
        child_revision_artifacts: childRevisionArtifacts,
        runtime_rows: rows.rows,
        resource_specs: specs.rows,
        parameters: parameters.rows,
        formulas: formulas.rows,
        artifacts: artifacts.rows,
        content_audit: contentAudit,
        runtime_source: `RESTORED_IMMUTABLE_POST_ACCEPTANCE_DATABASE_DUMP_READ_ONLY_TRANSACTION:${SNAPSHOT_ID}`,
        release_performed: false,
        deploy_performed: false,
        ota_performed: false,
        merge_performed: false,
        push_performed: false,
        batch009_performed: false,
        status: "CAPTURED_BEFORE_RUNTIME_COMPOSITION_CONTENT_RED_NO_RELEASE",
      };
      const output = { ...payload, payload_sha256: hashObject(payload) };
      const path = resolve(OUTPUT_ROOT, `${String(selected.ordinal).padStart(2, "0")}-${fileToken(String(selected.catalog_id))}.json`);
      atomicJson(path, output);
      outputs.push({
        ordinal: selected.ordinal,
        batch_id: selected.batch_id,
        catalog_id: selected.catalog_id,
        revision_id: revision.id,
        revision_number: revision.revision_number,
        child_revision_count: childRevisions.length,
        row_count: rows.rows.length,
        content_verdict: contentAudit.overall,
        path: path.replaceAll("\\", "/"),
        sha256: hashFile(path),
        payload_sha256: output.payload_sha256,
      });
      revisionBindings.push(revisionBinding);
    }
    await client.query("commit");
    const selectedSet = new Set(outputs.map((entry) => entry.catalog_id));
    const indexPayload = {
      schema_version: "real-useful-estimates-batch001-008-r1.before-runtime-snapshot-index.v1",
      generated_at: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      source: {
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        tree: execFileSync("git", ["show", "-s", "--format=%T", "HEAD"], { encoding: "utf8" }).trim(),
      },
      selection_manifest_sha256: hashFile(SELECTION),
      database: identity,
      release,
      expected_global_cases: 50,
      captured_from_this_snapshot: outputs.length,
      missing_from_this_snapshot: (selection.selections as Json[])
        .filter((entry) => !selectedSet.has(String(entry.catalog_id)))
        .map((entry) => ({ ordinal: entry.ordinal, batch_id: entry.batch_id, catalog_id: entry.catalog_id })),
      cases: outputs,
      content_green_claimed: false,
      release_performed: false,
      deploy_performed: false,
      ota_performed: false,
      merge_performed: false,
      push_performed: false,
      batch009_performed: false,
      blockers: [],
      status: `PARTIAL_BEFORE_RUNTIME_SNAPSHOT_${outputs.length}_OF_50_CONTENT_RED_NO_RELEASE`,
    };
    const index = { ...indexPayload, payload_sha256: hashObject(indexPayload) };
    const indexPath = resolve(OUTPUT_ROOT, `BEFORE_RUNTIME_SNAPSHOT_INDEX_${SNAPSHOT_ID}.json`);
    atomicJson(indexPath, index);
    const existingBindingManifest = (() => {
      try {
        return readJson(REVISION_BINDING_MANIFEST);
      } catch {
        return null;
      }
    })();
    if (existingBindingManifest) {
      invariant(existingBindingManifest.master_sha256 === MASTER_SHA256, "BEFORE_REVISION_BINDING_MASTER_DRIFT");
      invariant(existingBindingManifest.catalog_set_sha256 === selection.catalog_set_sha256,
        "BEFORE_REVISION_BINDING_CATALOG_SET_DRIFT");
    }
    const mergedBindings = new Map<string, Json>(
      [...(existingBindingManifest?.bindings ?? []), ...revisionBindings]
        .map((binding: Json) => [String(binding.catalog_id), binding]),
    );
    const bindingPayload = {
      schema_version: "real-useful-estimates-batch001-008-r1.before-50-revision-binding-manifest.v1",
      generated_at: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      selection_manifest_path: SELECTION.replaceAll("\\", "/"),
      selection_manifest_sha256: hashFile(SELECTION),
      catalog_set_sha256: selection.catalog_set_sha256,
      expected_cases: 50,
      bound_cases: mergedBindings.size,
      missing_catalog_ids: (selection.selections as Json[])
        .filter((entry) => !mergedBindings.has(String(entry.catalog_id)))
        .map((entry) => String(entry.catalog_id)),
      bindings: [...mergedBindings.values()].sort((left, right) => Number(left.ordinal) - Number(right.ordinal)),
      revision_policy: {
        before_material_composition: "ROOT_PARENT_ONLY",
        root_predicate: "parent_revision_id IS NULL AND revision_number = 1",
        child_revisions: "PRESERVED_SEPARATELY_AND_EXCLUDED_FROM_BEFORE_MATERIAL_COMPOSITION",
        latest_revision_selection_prohibited: true,
      },
      content_green_claimed: false,
      release_performed: false,
      deploy_performed: false,
      ota_performed: false,
      merge_performed: false,
      push_performed: false,
      batch009_performed: false,
      status: `PARTIAL_BEFORE_REVISION_BINDINGS_${mergedBindings.size}_OF_50_CONTENT_RED_NO_RELEASE`,
    };
    const bindingManifest = { ...bindingPayload, payload_sha256: hashObject(bindingPayload) };
    atomicJson(REVISION_BINDING_MANIFEST, bindingManifest);
    process.stdout.write(`${JSON.stringify({
      status: index.status,
      captured: outputs.length,
      rows: outputs.reduce((sum, entry) => sum + Number(entry.row_count), 0),
      red: outputs.filter((entry) => entry.content_verdict === "RED").length,
      index: indexPath.replaceAll("\\", "/"),
      index_sha256: hashFile(indexPath),
      payload_sha256: index.payload_sha256,
      revision_binding_manifest: REVISION_BINDING_MANIFEST.replaceAll("\\", "/"),
      revision_binding_manifest_sha256: hashFile(REVISION_BINDING_MANIFEST),
      revision_binding_payload_sha256: bindingManifest.payload_sha256,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main();
