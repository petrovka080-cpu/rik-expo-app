import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-9.f09-price-pipeline-audit.v1";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const POINTER_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/price-pipeline-v1/acceptance.json",
);
const POSITIVE_REVISION_ID = "48ed9f77-a6c4-459e-9947-cb4c7492a0f0";
const POSITIVE_SNAPSHOT_ID = "325c8e7b-714c-43e8-a55b-fec21e5d0314";
const POSITIVE_ARTIFACT_ROOT = resolve(
  ".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts/"
    + "9395fc71-de9c-4d39-b7a7-b966d4a8c362/"
    + `${POSITIVE_REVISION_ID}`,
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STOP_S279_F09_PRICE_PIPELINE_${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string): string {
  return sha256(readFileSync(path));
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const pointer = JSON.parse(readFileSync(POINTER_PATH, "utf8")) as Json;
  const releaseId = String(pointer.definitionReleaseId ?? "");
  invariant(releaseId, "RELEASE_POINTER");

  const client = new Client({ connectionString: DATABASE_URL, statement_timeout: 30_000 });
  await client.connect();
  try {
    const f09 = (await client.query(`select m.catalog_id,d.id::text definition_version_id,
        d.definition_version,count(distinct resource.id)::int resource_count,
        count(distinct binding.resource_spec_id)::int bound_resource_count,
        count(distinct binding.route_id)::int route_count
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_resource_spec resource on resource.definition_version_id=d.id
      left join public.estimate_resource_price_route_binding binding
        on binding.resource_spec_id=resource.id
      where m.release_id=$1::uuid and m.catalog_id=any($2::text[])
      group by m.catalog_id,d.id,d.definition_version order by m.catalog_id`, [releaseId, [
      "canonical-work:base:special_repair_interior_fireproof_inject_small_area",
      "canonical-work:base:special_repair_interior_fireproof_inject_standard",
    ]])).rows as Json[];
    invariant(f09.length === 2 && f09.every((entry) =>
      Number(entry.resource_count) === 46
      && Number(entry.bound_resource_count) === 0
      && Number(entry.route_count) === 0), "F09_BINDING_READBACK");

    const f09CandidatePriceKeyItems = (await client.query(`select item.price_key,item.unit_id,
        item.currency_code,item.unit_price::text,snapshot.id::text snapshot_id,
        snapshot.valid_until,route.route_key,route.active
      from public.estimate_price_snapshot_item item
      join public.estimate_price_snapshot snapshot on snapshot.id=item.snapshot_id
      join public.estimate_price_route route on route.id=snapshot.route_id
      where lower(item.price_key) like any(array[
        '%sika%','%injection%','%inject%','%packer%','%nipple%',
        '%compressor%','%battery%drill%'
      ]) order by snapshot.captured_at desc,item.price_key limit 100`)).rows as Json[];
    invariant(f09CandidatePriceKeyItems.length === 0, "F09_COMPATIBLE_PRICE_KEY_UNEXPECTED");

    const positiveRoute = (await client.query(`select manifest.catalog_id,resource.row_id,
        resource.title_ru,resource.unit_id,resource.cost_owner_id,binding.price_key,
        route.id::text route_id,route.route_key,route.currency_code,route.region_code,
        route.source_kind,snapshot.id::text snapshot_id,snapshot.captured_at,
        snapshot.valid_until,item.unit_price::text item_unit_price,item.currency_code item_currency
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_resource_spec resource
        on resource.definition_version_id=manifest.definition_version_id
      join public.estimate_resource_price_route_binding binding
        on binding.resource_spec_id=resource.id
      join public.estimate_price_route route on route.id=binding.route_id and route.active
      join public.estimate_price_snapshot snapshot on snapshot.route_id=route.id
        and snapshot.captured_at<=now()
        and (snapshot.valid_until is null or snapshot.valid_until>now())
      join public.estimate_price_snapshot_item item on item.snapshot_id=snapshot.id
        and item.price_key=binding.price_key and item.unit_id=resource.unit_id
        and item.currency_code=route.currency_code
      where manifest.release_id=$1::uuid
        and manifest.catalog_id='canonical-work:expanded:strip_foundation'
      order by resource.ordinal,snapshot.captured_at desc`, [releaseId])).rows as Json[];
    invariant(positiveRoute.length === 5
      && positiveRoute.every((entry) => entry.snapshot_id === POSITIVE_SNAPSHOT_ID),
    "POSITIVE_ROUTE_READBACK");

    const revision = (await client.query(`select id::text,catalog_id,release_id::text,
        definition_version_id::text,search_release_id::text,price_snapshot_ids,row_count,
        totals,status,checksum_sha256,created_at
      from public.estimate_revision where id=$1::uuid`, [POSITIVE_REVISION_ID])).rows[0] as Json;
    invariant(revision?.catalog_id === "canonical-work:expanded:strip_foundation"
      && revision.price_snapshot_ids?.includes(POSITIVE_SNAPSHOT_ID)
      && Number(revision.totals?.pricedRowCount) >= 5, "POSITIVE_REVISION_READBACK");
    const positiveRows = (await client.query(`select row_id,unit_id,quantity::text,
        unit_price::text,amount::text,currency_code
      from public.estimate_revision_row where revision_id=$1::uuid
        and row_id=any($2::text[]) order by ordinal`, [POSITIVE_REVISION_ID, [
      "main_concrete", "reinforcement", "binding_wire", "formwork_system",
      "reinforcement_install",
    ]])).rows as Json[];
    invariant(positiveRows.length === 5
      && positiveRows.every((entry) => Number(entry.unit_price) > 0),
    "POSITIVE_REVISION_ROWS");

    const checksum = String(revision.checksum_sha256);
    const procurementPath = resolve(POSITIVE_ARTIFACT_ROOT, "procurement", `${checksum}.json`);
    const pdfPath = resolve(POSITIVE_ARTIFACT_ROOT, "professional_pdf", `${checksum}.pdf`);
    const procurement = JSON.parse(readFileSync(procurementPath, "utf8")) as Json;
    invariant(procurement.revisionId === POSITIVE_REVISION_ID
      && procurement.revisionChecksumSha256 === checksum
      && procurement.rows.some((entry: Json) =>
        entry.rowId === "main_concrete" && Number(entry.unitPrice) === 3500),
    "POSITIVE_PROCUREMENT_ARTIFACT");
    invariant(readFileSync(pdfPath).subarray(0, 5).toString("ascii") === "%PDF-",
      "POSITIVE_PDF_ARTIFACT");

    const localBackend = readFileSync(
      resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
      "utf8",
    );
    invariant(localBackend.includes("resolveDefaultPriceSnapshotIds")
      && localBackend.includes("estimate_resource_price_route_binding")
      && localBackend.includes("estimate_price_snapshot_item")
      && localBackend.includes("priceItems"), "COMMON_OWNER_TRACE");

    const body = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      status: "GREEN_S279_F09_PRICE_PIPELINE_HONEST_NULL_WITH_POSITIVE_CONTROL",
      release: {
        definitionReleaseId: releaseId,
        searchReleaseId: pointer.searchReleaseId,
      },
      f09: {
        definitions: f09,
        compatiblePriceKeyItems: f09CandidatePriceKeyItems,
        outcome: "NO_COMPATIBLE_BOUND_PRICE_SOURCE_AUTOMATIC_PRICE_REMAINS_NULL",
        manualTestPricesPromoted: false,
      },
      commonOwnerTrace: {
        source: "estimate_price_snapshot/item",
        binding: "estimate_resource_price_route_binding",
        selection: "resolveDefaultPriceSnapshotIds",
        compilerInput: "priceItems + priceSnapshotIds",
        revision: "estimate_revision + estimate_revision_row",
        projections: "procurement JSON + professional PDF bound to revision checksum",
      },
      positiveControl: {
        scope: "canonical-work:expanded:strip_foundation",
        scopeDoesNotClaimF09Coverage: true,
        compatibleRouteRows: positiveRoute,
        revision,
        pricedRows: positiveRows,
        procurementArtifact: {
          path: procurementPath,
          sha256: fileSha256(procurementPath),
        },
        professionalPdfArtifact: {
          path: pdfPath,
          sha256: fileSha256(pdfPath),
        },
      },
      databaseWrites: 0,
      supplierRequests: 0,
      procurementCreated: false,
      productionAccessed: false,
    };
    atomicJson(OUTPUT_PATH, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
    process.stdout.write(`${JSON.stringify({
      status: body.status,
      outputPath: OUTPUT_PATH,
      f09BoundResources: f09.map((entry) => entry.bound_resource_count),
      positiveControlRows: positiveRoute.length,
      positiveRevisionId: POSITIVE_REVISION_ID,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
