import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md");
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const DEFINITION_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const SEARCH_RELEASE_ID = String(process.env.R58_SEARCH_RELEASE_ID ?? "367c2439-df83-5f27-bedd-89247b50caae").trim();
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_REPRESENTATIVE_50_MANIFEST.json");

const MANDATORY = [
  "flooring_interior_laminate_install_large_area",
  "r58-real:reinforced-concrete-equipment-pedestal",
  "built-in-ai-1000:0702",
  "built-in-ai-1000:0670",
  "concrete_foundation_interior_reinforcement_frame_reinforce_wet_zone",
  "r58-real:bridge-bored-pile-installation",
  "drywall_ceiling_interior_drywall_partition_install_large_area",
  "electrical_interior_power_cable_lay_large_area",
  "expanded-template:village_water_supply_preliminary_boq_expanded_complex_v1",
  "expanded-template:HVAC_plant_room_preliminary_boq_expanded_complex_v1",
  "r58-real:wall-plaster-application",
  "r58-real:gabion-wall-construction",
  "r58-real:masonry-wall-openings-lintels",
  "r58-real:roofing-membrane-system",
  "r58-real:monolithic-reinforced-concrete",
  "r58-real:finish-coating-application",
] as const;

function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_REP50_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH && git(["status", "--porcelain=v1"]) === "", "R58_REP50_SOURCE_RED");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r58-representative-50-manifest" });
  await client.connect();
  try {
    const candidates = (await client.query(`select document.catalog_id "catalogId",document.canonical_name_ru "nameRu",
        document.domain_id "domainId",document.group_id "groupId",document.operation_kind "operationKind",
        document.primary_uom "primaryUom",document.required_inputs_count "requiredInputsCount",
        document.definition_version_id::text "definitionVersionId",
        count(distinct resource.id)::int "resourceRows",
        count(distinct resource.id) filter(where resource.procurement_eligible)::int "procurementRows",
        count(distinct resource.id) filter(where resource.row_type='labor')::int "laborRows",
        count(distinct resource.id) filter(where resource.row_type='equipment')::int "equipmentRows"
      from public.estimate_search_document document
      join public.estimate_resource_spec resource on resource.definition_version_id=document.definition_version_id
      where document.search_release_id=$1 and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
        and document.definition_release_id=$2
      group by document.catalog_id,document.canonical_name_ru,document.domain_id,document.group_id,
        document.operation_kind,document.primary_uom,document.required_inputs_count,document.definition_version_id
      order by document.domain_id,document.catalog_id`, [SEARCH_RELEASE_ID, DEFINITION_RELEASE_ID])).rows as Json[];
    const byId = new Map(candidates.map((row) => [String(row.catalogId), row]));
    invariant(MANDATORY.every((catalogId) => byId.has(catalogId)), "R58_REP50_MANDATORY_CROSSWALK_RED");
    const selected: Json[] = MANDATORY.map((catalogId, index) => ({ ...byId.get(catalogId)!,
      selection: "MANDATORY_FROZEN", ordinal: index + 1 }));
    const selectedIds = new Set(MANDATORY as readonly string[]);
    const domains = [...new Set(candidates.map((row) => String(row.domainId)))].sort();
    const queues = new Map(domains.map((domain) => [domain, candidates.filter((row) => row.domainId === domain
      && !selectedIds.has(String(row.catalogId))).sort((left, right) => {
      const leftHash = sha256(`${SPEC_SHA256}:${left.catalogId}`);
      const rightHash = sha256(`${SPEC_SHA256}:${right.catalogId}`);
      return leftHash.localeCompare(rightHash);
    })]));
    while (selected.length < 50) {
      let advanced = false;
      for (const domain of domains) {
        const row = queues.get(domain)?.shift();
        if (!row) continue;
        selected.push({ ...row, selection: "DETERMINISTIC_DOMAIN_ROUND_ROBIN", ordinal: selected.length + 1 });
        selectedIds.add(String(row.catalogId));
        advanced = true;
        if (selected.length === 50) break;
      }
      invariant(advanced, "R58_REP50_CANDIDATES_EXHAUSTED");
    }
    const domainCounts = Object.fromEntries(domains.map((domain) => [domain,
      selected.filter((row) => row.domainId === domain).length]).filter(([, count]) => Number(count) > 0));
    invariant(selected.length === 50 && new Set(selected.map((row) => row.catalogId)).size === 50,
      "R58_REP50_DENOMINATOR_RED");
    invariant(selected.every((row) => Number(row.resourceRows) > 0 && Number(row.requiredInputsCount) > 0),
      "R58_REP50_EMPTY_DEFINITION_RED");
    invariant(selected.some((row) => Number(row.procurementRows) > 0)
      && selected.some((row) => Number(row.laborRows) > 0)
      && selected.some((row) => Number(row.equipmentRows) > 0), "R58_REP50_ROLE_COVERAGE_RED");
    const manifest = {
      schemaVersion: "p0-one-monolith-r58-representative-50-manifest.v1",
      capturedAt: new Date().toISOString(), specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true },
      definitionReleaseId: DEFINITION_RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID,
      selectionContract: "16 frozen mandatory + deterministic SHA-256 domain round-robin to 50",
      professionalReviewLenses: ["сметчик", "инженер", "прораб", "закупщик", "архитектор"],
      domainCounts, mandatoryDenominator: "16/16", totalDenominator: "50/50",
      catalogIds: selected.map((row) => row.catalogId), rows: selected,
      catalogSetSha256: sha256(selected.map((row) => row.catalogId).join("\n")),
      status: "GREEN_R58_REPRESENTATIVE_50_MANIFEST_FROZEN_NOT_TERMINAL",
    };
    writeJson(OUTPUT, manifest);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
