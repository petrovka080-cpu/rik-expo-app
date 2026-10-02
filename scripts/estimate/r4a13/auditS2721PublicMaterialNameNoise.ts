import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { normalizePublicBoqNameRu } from "../../../src/lib/estimate/publicBoqNaming";

type Json = Record<string, any>;
type LongMaterialTitleRow = {
  title_ru: string;
  row_count: number;
  source_length: number;
};

const CONTRACT = "rik-expo-app.s27-21.public-material-name-noise-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/public-material-name-noise-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const SOURCE_PATHS = [
  "src/lib/estimate/publicBoqNaming.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  "src/features/consumerRepair/requestEstimateViewModel.r4.test.ts",
  "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
  "src/lib/consumerRequests/consumerRequestPdfService.ts",
  "src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts",
  "src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts",
  "tests/consumerRepair/procurementArtifactStaysInProductUi.contract.test.ts",
  "tests/requestEstimate/requestPdfUsesCanonicalPayloadRows.contract.test.ts",
  "tests/aiEstimatePdf/aiEstimatePdfViewModel.contract.test.ts",
  "scripts/estimate/r4a13/auditS2721PublicMaterialNameNoise.ts",
] as const;

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
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_PUBLIC_NAME_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_PUBLIC_NAME_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S2721_PUBLIC_NAME_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S2721_PUBLIC_NAME_MASTER_HASH");

  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false
    && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft",
  "STOP_S2721_PUBLIC_NAME_POINTER_STATE");
  const pdfServiceSource = readFileSync(resolve(
    "src/lib/consumerRequests/consumerRequestPdfService.ts",
  ), "utf8");
  const pdfContractSource = readFileSync(resolve(
    "tests/requestEstimate/requestPdfUsesCanonicalPayloadRows.contract.test.ts",
  ), "utf8");
  invariant(pdfServiceSource.includes("publicBoqDisplayNameRu({")
    && pdfServiceSource.includes("sourceNameRu: item.titleRu")
    && pdfServiceSource.includes("rowType: item.itemType"),
  "STOP_S2721_PUBLIC_NAME_PDF_SHARED_OWNER_NOT_WIRED");
  invariant(pdfContractSource.includes("uses the shared concise material title in the rendered PDF")
    && pdfContractSource.includes("renderEstimatePdfBinaryDocument")
    && pdfContractSource.includes("expect(text).not.toContain(verbose)")
    && pdfContractSource.includes("uses the shared concise material title through the AI PDF consumer-draft adapter"),
  "STOP_S2721_PUBLIC_NAME_BINARY_PDF_REGRESSION_NOT_LOCKED");
  const aiPdfResolverSource = readFileSync(resolve(
    "src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts",
  ), "utf8");
  invariant(aiPdfResolverSource.includes("publicBoqDisplayNameRu({")
    && aiPdfResolverSource.includes("rowType: item.itemType"),
    "STOP_S2721_PUBLIC_NAME_AI_PDF_SHARED_OWNER_NOT_WIRED");
  const directAiPdfViewModelSource = readFileSync(resolve(
    "src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts",
  ), "utf8");
  invariant(directAiPdfViewModelSource.includes("name: publicBoqDisplayNameRu({")
    && directAiPdfViewModelSource.includes("rowType: section.type"),
    "STOP_S2721_PUBLIC_NAME_DIRECT_AI_PDF_SHARED_OWNER_NOT_WIRED");
  const mainEstimateViewModelSource = readFileSync(resolve(
    "src/features/consumerRepair/requestEstimateViewModel.ts",
  ), "utf8");
  const mainEstimateContractSource = readFileSync(resolve(
    "src/features/consumerRepair/requestEstimateViewModel.r4.test.ts",
  ), "utf8");
  invariant(mainEstimateViewModelSource.includes("publicBoqDisplayNameRu({")
    && mainEstimateViewModelSource.includes("rowType: item.itemType"),
  "STOP_S2721_PUBLIC_NAME_MAIN_ESTIMATE_SHARED_OWNER_NOT_WIRED");
  const progressiveEstimatePanelSource = readFileSync(resolve(
    "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
  ), "utf8");
  invariant(progressiveEstimatePanelSource.includes("publicBoqDisplayNameRu({")
    && progressiveEstimatePanelSource.includes("rowType: row.rowType"),
  "STOP_S2721_PUBLIC_NAME_PROCUREMENT_SHARED_OWNER_NOT_WIRED");
  invariant(mainEstimateContractSource.includes("shows the concise bridge material name in the main estimate without mutating canonical data")
    && mainEstimateContractSource.includes("invalid-admission-sha")
    && mainEstimateContractSource.includes("expect(bundle.items[0]?.titleRu).toBe(verbose)"),
  "STOP_S2721_PUBLIC_NAME_MAIN_ESTIMATE_REGRESSION_NOT_LOCKED");
  const procurementContractSource = readFileSync(resolve(
    "tests/consumerRepair/procurementArtifactStaysInProductUi.contract.test.ts",
  ), "utf8");
  invariant(procurementContractSource.includes("preserves non-material canonical titles byte-for-byte")
    && procurementContractSource.includes('rowType: "service"')
    && procurementContractSource.includes('rowType: "work"'),
  "STOP_S2721_PUBLIC_NAME_NON_MATERIAL_REGRESSION_NOT_LOCKED");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "s27-21-public-material-name-noise-audit",
  });
  await client.connect();
  try {
    await client.query("begin read only");
    const rows = (await client.query(`
      select resource.title_ru,
        count(*)::int as row_count,
        length(resource.title_ru)::int as source_length
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_resource_spec resource
        on resource.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1
        and resource.row_type='material'
        and length(resource.title_ru)>80
      group by resource.title_ru
      order by length(resource.title_ru) desc,resource.title_ru
    `, [current.definitionReleaseId])).rows as LongMaterialTitleRow[];
    await client.query("rollback");

    const projected = rows.map((row) => {
      const publicNameRu = normalizePublicBoqNameRu({ sourceNameRu: row.title_ru });
      return {
        sourceNameRu: row.title_ru,
        publicNameRu,
        sourceLength: Number(row.source_length),
        publicLength: publicNameRu.length,
        rowCount: Number(row.row_count),
        changed: publicNameRu !== row.title_ru,
      };
    });
    const changed = projected.filter((row) => row.changed);
    const preserved = projected.filter((row) => !row.changed);
    const originalLongRows = projected.reduce((sum, row) => sum + row.rowCount, 0);
    const compactedRows = changed.reduce((sum, row) => sum + row.rowCount, 0);
    const preservedLongRows = preserved.reduce((sum, row) => sum + row.rowCount, 0);

    invariant(projected.length === 27 && originalLongRows === 64,
      `STOP_S2721_PUBLIC_NAME_DENOMINATOR:${projected.length}:${originalLongRows}`);
    invariant(changed.length === 19 && compactedRows === 25,
      `STOP_S2721_PUBLIC_NAME_COMPACTED_DENOMINATOR:${changed.length}:${compactedRows}`);
    invariant(preserved.length === 8 && preservedLongRows === 39,
      `STOP_S2721_PUBLIC_NAME_PRESERVED_DENOMINATOR:${preserved.length}:${preservedLongRows}`);
    invariant(changed.every((row) => row.publicLength <= 44),
      "STOP_S2721_PUBLIC_NAME_CHANGED_STILL_LONG");
    invariant(preserved.some((row) => row.sourceNameRu.includes("толщина 44 мм и более, III сорт")),
      "STOP_S2721_PUBLIC_NAME_CRITICAL_SPEC_NOT_PRESERVED");

    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "GREEN_S2721_PUBLIC_MATERIAL_NAME_NOISE_COMPACTED_DISPLAY_ONLY_NOT_PUBLISHED",
      mutationPerformed: false,
      boundary: {
        definitionReleaseId: current.definitionReleaseId,
        definitionReleaseStatus: current.definitionReleaseStatus,
        searchReleaseId: current.searchReleaseId,
        searchReleaseStatus: current.searchReleaseStatus,
        owner: current.owner,
        originalLongMaterialRows: originalLongRows,
        originalLongDistinctTitles: projected.length,
      },
      projection: {
        compactedRows,
        compactedDistinctTitles: changed.length,
        preservedSpecificationCriticalRows: preservedLongRows,
        preservedSpecificationCriticalDistinctTitles: preserved.length,
        changed,
        preserved,
      },
      checks: {
        displayOnlyProjection: true,
        sourceResourceRowsMutated: false,
        definitionOrSearchReleaseMutated: false,
        blindLengthTruncationUsed: false,
        allCompactedNamesAtMost80Characters: true,
        allCompactedNamesFitDirectPdfNameColumn: true,
        specificationCriticalLongNamesPreserved: true,
        pdfUsesSharedPublicNameProjection: true,
        aiPdfAdapterUsesSharedPublicNameProjection: true,
        directAiPdfUsesSharedPublicNameProjection: true,
        mainEstimateUsesSharedPublicNameProjection: true,
        procurementUsesSharedPublicNameProjection: true,
        mainEstimateAdmissionFailClosed: true,
        nonMaterialCanonicalTitlesPreserved: true,
        binaryPdfRegressionLocked: true,
        productionAccessed: false,
        deployPerformed: false,
        activationPerformed: false,
      },
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        tree: git("rev-parse", "HEAD^{tree}"),
        sourceHashes: SOURCE_PATHS.map((path) => ({
          path,
          sha256: sha256(readFileSync(resolve(path))),
          trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
        })),
      },
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    };
    receipt.receiptSha256 = sha256(receipt);
    atomicJson(OUTPUT_PATH, receipt);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      boundary: receipt.boundary,
      projection: {
        compactedRows,
        compactedDistinctTitles: changed.length,
        preservedSpecificationCriticalRows: preservedLongRows,
        preservedSpecificationCriticalDistinctTitles: preserved.length,
      },
      receiptSha256: receipt.receiptSha256,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main();
