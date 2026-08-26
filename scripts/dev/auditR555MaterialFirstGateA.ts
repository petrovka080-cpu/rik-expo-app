import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const RELEASE_ID = "dfddce32-54a9-58fe-94f3-b195e9694428";
const SEARCH_RELEASE_ID = "ebf25c2d-6a12-5686-9985-30f50a32a43a";
const PRICE_SNAPSHOT_ID = "dbdb1156-9408-57c7-bd99-ca8ed26a62ec";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const GATE = resolve(".release-runtime/r555/evidence/09_R555_MATERIAL_FIRST_GATE_A.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/10_R555_MATERIAL_FIRST_CONTENT_GATE.json");
const EXPECTED_CATEGORIES: Record<string, number> = {
  "Материалы": 6,
  "Труд": 9,
  "Механизмы": 3,
  "Доставка": 2,
  "Контроль качества": 5,
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const gate = JSON.parse(readFileSync(GATE, "utf8")) as Json;
  invariant(gate.master_sha256 === MASTER_SHA256, "R555_CONTENT_GATE_MASTER_DRIFT");
  invariant(gate.status === "GREEN_R555_MATERIAL_FIRST_FUNCTIONAL_AND_CONTENT_2_OF_2", "R555_BROWSER_GATE_NOT_GREEN");
  invariant(gate.green === 2 && gate.denominator === 2, "R555_BROWSER_GATE_DENOMINATOR_RED");
  const revisionIds = gate.cases.map((item: Json) => String(item.revision_id));
  invariant(revisionIds.length === 2 && revisionIds.every(Boolean), "R555_GATE_REVISION_IDS_MISSING");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const revisions = (await client.query(
      `select * from public.estimate_revision where id=any($1::uuid[]) order by catalog_id`,
      [revisionIds],
    )).rows as Json[];
    const rows = (await client.query(
      `select * from public.estimate_revision_row where revision_id=any($1::uuid[]) order by revision_id,ordinal`,
      [revisionIds],
    )).rows as Json[];
    const prices = (await client.query(
      `select * from public.estimate_revision_row_price where revision_id=any($1::uuid[]) order by revision_id,row_id`,
      [revisionIds],
    )).rows as Json[];
    const artifacts = (await client.query(
      `select revision_id::text,artifact_kind,status,byte_size,error_code,metadata
         from public.estimate_revision_artifact where revision_id=any($1::uuid[])
         order by revision_id,artifact_kind`,
      [revisionIds],
    )).rows as Json[];
    invariant(revisions.length === 2, `R555_CONTENT_REVISION_COUNT:${revisions.length}`);

    const cases = revisions.map((revision) => {
      const revisionRows = rows.filter((row) => String(row.revision_id) === String(revision.id));
      const revisionPrices = prices.filter((row) => String(row.revision_id) === String(revision.id));
      const revisionArtifacts = artifacts.filter((row) => String(row.revision_id) === String(revision.id));
      const categoryCounts = Object.fromEntries(Object.keys(EXPECTED_CATEGORIES).map((category) => [
        category,
        revisionRows.filter((row) => row.category === category).length,
      ]));
      const genericRows = revisionRows.filter((row) =>
        /^(?:поставка (?:состава|системы) для|работа (?:механизма|домкратов|.*оборудования)|выполнение работ)/iu.test(String(row.title_ru))
      );
      const publicEnglishRows = revisionRows.filter((row) => /[A-Za-z]{2,}/u.test(String(row.title_ru)));
      const epsilonRows = revisionRows.filter((row) => Number(row.quantity) === 0.000001);
      const nonPositiveRows = revisionRows.filter((row) => Number(row.quantity) <= 0);
      const unpricedRows = revisionRows.filter((row) => row.unit_price == null || row.amount == null);
      const formulaRows = revisionRows.filter((row) => String(row.calculation_trace?.formulaId ?? "").length > 0);
      const canonicalOwnerRows = revisionRows.filter((row) =>
        row.calculation_trace?.resourceGraph?.owner === "CANONICAL_BACKEND_ONLY"
      );
      const applicableRows = revisionRows.filter((row) =>
        String(row.calculation_trace?.resourceGraph?.applicabilityRu ?? "").length > 0
      );
      const sourceRows = revisionRows.filter((row) => Array.isArray(row.normative_trace) && row.normative_trace.length > 0);
      const materialRows = revisionRows.filter((row) => row.category === "Материалы");
      const packagedMaterials = materialRows.filter((row) => {
        const packageRu = String(row.calculation_trace?.resourceGraph?.packageRu ?? "");
        return packageRu.length > 0 && packageRu !== "Не применяется";
      });
      const materialDeliveryDefined = materialRows.filter((row) =>
        String(row.calculation_trace?.resourceGraph?.deliveryRu ?? "").length > 0
      );
      const wasteFormulaCount = materialRows.filter((row) =>
        /waste|отход|запас/iu.test(JSON.stringify(row.calculation_trace?.resourceGraph ?? {}))
      ).length;
      const priceSnapshotRows = revisionPrices.filter((row) =>
        String(row.price_snapshot_id) === PRICE_SNAPSHOT_ID && Number(row.unit_price) > 0
      );
      const procurement = revisionArtifacts.find((row) => row.artifact_kind === "procurement");
      const pdf = revisionArtifacts.find((row) => row.artifact_kind === "professional_pdf");
      const total = Number(revision.totals?.amount ?? 0);
      const gateCase = gate.cases.find((item: Json) => String(item.revision_id) === String(revision.id));
      const green =
        revision.release_id === RELEASE_ID &&
        revision.search_release_id === SEARCH_RELEASE_ID &&
        Number(revision.row_count) === 25 &&
        revisionRows.length === 25 &&
        Object.entries(EXPECTED_CATEGORIES).every(([category, expected]) => categoryCounts[category] === expected) &&
        genericRows.length === 0 &&
        publicEnglishRows.length === 0 &&
        epsilonRows.length === 0 &&
        nonPositiveRows.length === 0 &&
        unpricedRows.length === 0 &&
        formulaRows.length === 25 &&
        canonicalOwnerRows.length === 25 &&
        applicableRows.length === 25 &&
        sourceRows.length === 25 &&
        packagedMaterials.length === 6 &&
        materialDeliveryDefined.length === 6 &&
        wasteFormulaCount >= 1 &&
        revisionPrices.length === 25 &&
        priceSnapshotRows.length === 25 &&
        Array.isArray(revision.price_snapshot_ids) &&
        revision.price_snapshot_ids.length === 1 &&
        revision.price_snapshot_ids[0] === PRICE_SNAPSHOT_ID &&
        total > 0 &&
        procurement?.status === "ready" &&
        Number(procurement?.metadata?.projectedRowCount) === 8 &&
        Number(procurement?.byte_size) > 0 &&
        pdf?.status === "ready" &&
        Number(pdf?.metadata?.projectedRowCount) === 25 &&
        Number(pdf?.byte_size) > 0 &&
        gateCase?.history?.delta === 1 &&
        gateCase?.history?.contains_revision === true &&
        gateCase?.cold_restart?.row_identity_matches === true &&
        gateCase?.token_refreshed_count === 0;
      return {
        catalog_id: revision.catalog_id,
        revision_id: revision.id,
        status: green ? "GREEN" : "RED",
        canonical_work_title_ru: revision.canonical_work_title_ru,
        row_count: revisionRows.length,
        category_counts: categoryCounts,
        formula_rows: formulaRows.length,
        canonical_backend_owner_rows: canonicalOwnerRows.length,
        applicable_rows: applicableRows.length,
        source_backed_rows: sourceRows.length,
        material_packaging_rows: packagedMaterials.length,
        material_delivery_rows: materialDeliveryDefined.length,
        waste_formula_rows: wasteFormulaCount,
        priced_rows: revisionPrices.length,
        price_snapshot_rows: priceSnapshotRows.length,
        total_kgs: total,
        procurement_rows: Number(procurement?.metadata?.projectedRowCount ?? 0),
        pdf_rows: Number(pdf?.metadata?.projectedRowCount ?? 0),
        forbidden: {
          generic_titles: genericRows.length,
          english_words_in_public_titles: publicEnglishRows.length,
          epsilon_quantities: epsilonRows.length,
          non_positive_quantities: nonPositiveRows.length,
          unpriced_rows: unpricedRows.length,
        },
        browser: {
          history_delta: gateCase?.history?.delta,
          history_contains_revision: gateCase?.history?.contains_revision,
          cold_restart_identity: gateCase?.cold_restart?.row_identity_matches,
          pdf_ready: gateCase?.artifacts?.pdf_ready,
          procurement_ready: gateCase?.artifacts?.procurement_ready,
          token_refreshed_count: gateCase?.token_refreshed_count,
        },
      };
    });
    const green = cases.filter((item) => item.status === "GREEN").length;
    const receiptBase = {
      schema_version: "rik-expo-app-r555.material-first-independent-content-gate.v1",
      generated_utc: new Date().toISOString(),
      status: green === 2 ? "GREEN_R555_FUNCTIONAL_AND_CONTENT_2_OF_2" : "RED_R555_CONTENT_GATE",
      master_sha256: MASTER_SHA256,
      release_id: RELEASE_ID,
      search_release_id: SEARCH_RELEASE_ID,
      price_snapshot_id: PRICE_SNAPSHOT_ID,
      green,
      denominator: 2,
      aggregate: {
        rows: rows.length,
        priced_rows: prices.length,
        artifacts_ready: artifacts.filter((item) => item.status === "ready").length,
        generic_titles: cases.reduce((sum, item) => sum + item.forbidden.generic_titles, 0),
        english_words_in_public_titles: cases.reduce((sum, item) => sum + item.forbidden.english_words_in_public_titles, 0),
        epsilon_quantities: cases.reduce((sum, item) => sum + item.forbidden.epsilon_quantities, 0),
        non_positive_quantities: cases.reduce((sum, item) => sum + item.forbidden.non_positive_quantities, 0),
        unpriced_rows: cases.reduce((sum, item) => sum + item.forbidden.unpriced_rows, 0),
      },
      cases,
      price_scope: "LOCAL_ACCEPTANCE_ONLY_NOT_A_PRODUCTION_MARKET_CLAIM",
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
      secrets_captured: false,
    };
    invariant(green === 2, "R555_MATERIAL_FIRST_CONTENT_GATE_RED");
    atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(receiptBase) });
    process.stdout.write(`${JSON.stringify({ status: receiptBase.status, aggregate: receiptBase.aggregate, cases }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
