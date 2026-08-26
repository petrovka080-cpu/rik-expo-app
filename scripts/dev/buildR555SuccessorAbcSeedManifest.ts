import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app-r555.successor-abc-seed-manifest.v1";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const TARGET_RECEIPT = resolve(".release-runtime/r555/evidence/21B_R555_FULL_CUMULATIVE_STRICT_BACKEND_RESTART.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json");
const GATE_A_IDS = [
  "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
  "canonical-work:base:concrete_foundation_interior_belt_pour_repair",
] as const;
const GATE_B_DOMAINS = [
  "roadworks",
  "concrete_foundation",
  "plumbing",
  "electrical",
  "heating_hvac",
  "roofing",
  "masonry",
  "flooring",
  "earthworks",
  "ventilation",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_ABC_MANIFEST:${code}`);
}
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const target = JSON.parse(readFileSync(TARGET_RECEIPT, "utf8")) as Json;
  invariant(target.status === "GREEN_R555_STRICT_BACKEND_READY", "TARGET_NOT_GREEN");
  const releaseId = String(target.backend.target_release_id);
  const searchReleaseId = String(target.backend.search_release_id);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-successor-abc-seed-manifest" });
  await client.connect();
  try {
    const rows = (await client.query(`
      select manifest.catalog_id "catalogId",identity.title_ru "titleRu",identity.domain,
        document.group_id "groupId",definition.id::text "definitionVersionId",
        definition.release_id::text "definitionOwnerReleaseId",
        parameter.parameter_id "primaryMeasureParameterId",
        count(resource.row_id)::int "resourceRows",
        count(*) filter(where resource.row_type='material')::int "materialRows",
        count(*) filter(where resource.row_type='labor')::int "laborRows",
        count(*) filter(where resource.row_type in ('equipment','service'))::int "techniqueRows",
        count(*) filter(where resource.procurement_eligible)::int "procurementRows"
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
      join public.estimate_search_document document on document.search_release_id=$2 and document.catalog_id=manifest.catalog_id
      left join lateral (
        select item.parameter_id from public.estimate_parameter_definition item
        where item.definition_version_id=definition.id order by item.ordinal limit 1
      ) parameter on true
      left join public.estimate_resource_spec resource on resource.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.baseline_ready and manifest.scenario_ready
        and manifest.runtime_publication_state='CANDIDATE'
        and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
      group by manifest.catalog_id,identity.title_ru,identity.domain,document.group_id,definition.id,definition.release_id,parameter.parameter_id
      order by manifest.catalog_id
    `, [releaseId, searchReleaseId])).rows as Json[];
    invariant(rows.length === 10_329, `VISIBLE_DENOMINATOR_${rows.length}`);
    invariant(rows.every((row) => Number(row.resourceRows) > 0 && Number(row.materialRows) > 0
      && Number(row.laborRows) > 0 && Number(row.techniqueRows) > 0 && Number(row.procurementRows) > 0),
    "CONTENT_GAP_IN_CANDIDATES");
    const byId = new Map(rows.map((row) => [String(row.catalogId), row]));
    const ranked = (candidates: Json[], salt: string) => [...candidates].sort((left, right) =>
      sha256(`${MASTER_SHA256}:${salt}:${left.catalogId}`).localeCompare(sha256(`${MASTER_SHA256}:${salt}:${right.catalogId}`)));
    const gateA: Json[] = GATE_A_IDS.map((catalogId, index) => {
      const row = byId.get(catalogId);
      invariant(row, `GATE_A_ID_MISSING:${catalogId}`);
      return { ...row, ordinal: index + 1, selection: "EXACT_USER_REGRESSION" };
    });
    const gateASet = new Set(gateA.map((row) => String(row.catalogId)));
    const gateB: Json[] = GATE_B_DOMAINS.map((domain, index) => {
      const candidates = rows.filter((row) => row.domain === domain && !gateASet.has(String(row.catalogId)));
      invariant(candidates.length > 0, `GATE_B_DOMAIN_MISSING:${domain}`);
      const row = ranked(candidates, `gate-b:${domain}`)[0]!;
      return { ...row, ordinal: index + 1, selection: "DETERMINISTIC_DISTINCT_TECHNOLOGY_FAMILY" };
    });
    invariant(new Set(gateB.map((row) => row.catalogId)).size === 10, "GATE_B_NOT_UNIQUE");
    invariant(new Set(gateB.map((row) => row.domain)).size === 10, "GATE_B_DOMAIN_NOT_UNIQUE");

    const gateC: Json[] = [];
    const gateCIds = new Set<string>();
    const add = (row: Json, selection: string): void => {
      if (gateCIds.has(String(row.catalogId)) || gateC.length >= 50) return;
      gateCIds.add(String(row.catalogId));
      gateC.push({ ...row, ordinal: gateC.length + 1, selection });
    };
    for (const row of gateA) add(row, "FROZEN_GATE_A_REGRESSION_SUBSET");
    for (const row of gateB) add(row, "FROZEN_GATE_B_TECHNOLOGY_SUBSET");
    const domains = [...new Set(rows.map((row) => String(row.domain)))].sort();
    for (const domain of domains) {
      const candidate = ranked(rows.filter((row) => row.domain === domain && !gateCIds.has(String(row.catalogId))), `gate-c-domain:${domain}`)[0];
      if (candidate) add(candidate, "DETERMINISTIC_ALL_DOMAIN_COVERAGE");
    }
    let round = 0;
    while (gateC.length < 50) {
      let advanced = false;
      for (const domain of domains) {
        const candidate = ranked(rows.filter((row) => row.domain === domain && !gateCIds.has(String(row.catalogId))), `gate-c-fill:${round}:${domain}`)[0];
        if (!candidate) continue;
        add(candidate, "DETERMINISTIC_DOMAIN_ROUND_ROBIN_FILL");
        advanced = true;
        if (gateC.length === 50) break;
      }
      invariant(advanced, "GATE_C_CANDIDATES_EXHAUSTED");
      round += 1;
    }
    invariant(gateC.length === 50 && gateCIds.size === 50, "GATE_C_DENOMINATOR_RED");
    invariant(new Set(gateC.map((row) => row.domain)).size === domains.length, "GATE_C_ALL_DOMAIN_COVERAGE_RED");
    const receiptBase = {
      schema_version: CONTRACT,
      generated_utc: new Date().toISOString(),
      status: "GREEN_R555_SUCCESSOR_ABC_SEED_MANIFEST_FROZEN_BEFORE_BROWSER_RUN",
      master_sha256: MASTER_SHA256,
      candidate_release_id: releaseId,
      candidate_search_release_id: searchReleaseId,
      source_head: target.backend.source_head,
      source_tree: target.backend.source_tree,
      visible_denominator: rows.length,
      available_domain_count: domains.length,
      available_domains: domains,
      selection_seed: MASTER_SHA256,
      gate_a: { denominator: 2, catalog_set_sha256: sha256(gateA.map((row) => row.catalogId).join("\n")), cases: gateA },
      gate_b: { denominator: 10, unique_domains: 10, catalog_set_sha256: sha256(gateB.map((row) => row.catalogId).join("\n")), cases: gateB },
      gate_c: { denominator: 50, unique_domains: new Set(gateC.map((row) => row.domain)).size, catalog_set_sha256: sha256(gateC.map((row) => row.catalogId).join("\n")), cases: gateC },
      frozen_before_browser_run: true,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    };
    atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) });
    process.stdout.write(`${JSON.stringify({
      status: receiptBase.status,
      gate_a: gateA.length,
      gate_b: gateB.length,
      gate_c: gateC.length,
      gate_c_domains: receiptBase.gate_c.unique_domains,
      catalog_set_sha256: receiptBase.gate_c.catalog_set_sha256,
    })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
