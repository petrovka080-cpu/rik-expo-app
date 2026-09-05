import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";

import {
  buildCanonicalProfessionalPdfProjection,
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
} from "../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md",
);
const MASTER_SHA256 = "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const EVIDENCE_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1/16_web_android",
);
const MATRIX = [1, 45, 100, 500, 1001] as const;
const EXACT_SOURCE_PATHS = [
  "scripts/e2e/runR4A6ProfessionalPdfMatrix.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
  "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
  "supabase/functions/_shared/canonicalPdf.ts",
  "supabase/functions/canonical-estimate/index.ts",
  "supabase/functions/canonical-estimate-worker/index.ts",
] as const;

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function exactSourceIdentity() {
  const dirty = git(
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...EXACT_SOURCE_PATHS,
  );
  invariant(!dirty, `R4_A6_PDF_EXACT_SOURCE_DIRTY:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    paths: EXACT_SOURCE_PATHS,
  };
}

function revision(rowCount: number) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    release_id: "ad825133-a41e-527d-a2f2-e1dd0e65ea86",
    catalog_id: "canonical-work:expanded:battens_counterbattens",
    checksum_sha256: "f".repeat(64),
    row_count: rowCount,
    revision_number: 7,
    currency_code: "KGS",
    totals: { amount: String(rowCount * 200), includedRowCount: rowCount },
    input_parameters: { roof_area_m2: 216, slope_factor: 1.08 },
    primary_measure_value: "216",
    primary_measure_unit_id: "m2",
    created_at: "2026-09-04T10:30:00.000Z",
  };
}

const CATEGORIES = ["material", "labor", "equipment", "service", "transport"] as const;

function rows(rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => {
    const category = CATEGORIES[index % CATEGORIES.length];
    const missingPrice = rowCount === 45 && index === 21;
    return {
      row_id: `row-${index + 1}`,
      ordinal: index,
      section: category,
      category,
      title_ru: index === rowCount - 1
        ? `Комплект фасонных деталей ${index + 1} для герметичного примыкания кровельного покрытия к парапету с защитой от атмосферных осадков и контролем непрерывности узла`
        : `Профессиональная позиция ${index + 1}`,
      unit_id: index % 3 === 0 ? "m2" : index % 3 === 1 ? "m3" : "man_hour",
      quantity: index === 0 ? "12.3456" : String((index % 17) + 1),
      unit_price: missingPrice ? null : "100",
      amount: missingPrice ? null : "200",
      currency_code: "KGS",
      procurement_eligible: category === "material",
      included_in_estimate: true,
      included_in_procurement: category === "material",
      ownership_status: "OWNED",
      calculation_trace: {
        specificationRu: index === rowCount - 1 ? "Толщина и марка уточняются по проекту" : null,
        formulaExplanationRu: "Количество сохранено в immutable revision",
        inputParameterIds: ["roof_area_m2"],
      },
      normative_trace: [{ sourceId: "СП КР", locator: `таблица ${index + 1}` }],
      row_sha256: sha256(`row-${index + 1}`),
    };
  });
}

async function extractPdfText(bytes: Uint8Array): Promise<{ pageCount: number; text: string }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: bytes.slice(),
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    page.cleanup();
  }
  await document.destroy();
  return { pageCount: pages.length, text: pages.join("\n") };
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R4_A6_PDF_MASTER_SHA256_DRIFT");
  const source = exactSourceIdentity();
  const outputRoot = resolve(
    EVIDENCE_ROOT,
    `pdf-${source.commitSha}-terminal-green`,
  );
  mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const cases: Record<string, unknown>[] = [];
  try {
    for (const rowCount of MATRIX) {
      const sourceRows = rows(rowCount);
      const projection = buildCanonicalProfessionalPdfProjection({
        revision: revision(rowCount),
        rows: sourceRows,
        workTitleRu: "Монтаж кровельного покрытия",
        definitionVersionId: "de6d60c2-8489-5d39-9234-4917deaf889a",
      });
      const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
      const rssBefore = process.memoryUsage().rss;
      const startedAt = performance.now();
      await page.setContent(projection.html, { waitUntil: "load" });
      await page.emulateMedia({ media: "print" });
      if (rowCount === 45) {
        await page.screenshot({ path: resolve(outputRoot, "45-client-preview.png"), fullPage: false });
      }
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: projection.footerTemplate,
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const rssDeltaBytes = Math.max(0, process.memoryUsage().rss - rssBefore);
      await page.close();
      const pdfPath = resolve(outputRoot, `${rowCount}-rows.pdf`);
      writeFileSync(pdfPath, pdf);
      const extracted = await extractPdfText(new Uint8Array(pdf));
      const normalizedText = extracted.text.replace(/\s+/gu, " ").trim();
      const lastTitle = String(sourceRows[sourceRows.length - 1]?.title_ru);
      const expectedFooter = `Страница 1 из ${extracted.pageCount}`;
      const pdfAscii = Buffer.from(pdf).toString("latin1");
      const tableHeaderCount = normalizedText.split("Наименование и спецификация").length - 1;
      let previousRowOffset = -1;
      const allRowsInOrder = sourceRows.every((row) => {
        const offset = normalizedText.indexOf(String(row.title_ru), previousRowOffset + 1);
        if (offset < 0) return false;
        previousRowOffset = offset;
        return true;
      });
      const checks = {
        validHeader: pdfAscii.startsWith("%PDF-"),
        eof: pdfAscii.includes("%%EOF"),
        embeddedFont: /\/FontFile\d?\b/u.test(pdfAscii),
        pageCountPositive: extracted.pageCount > 0,
        exactFooter: normalizedText.includes(expectedFooter)
          && Array.from({ length: extracted.pageCount }, (_, index) =>
            normalizedText.includes(`Страница ${index + 1} из ${extracted.pageCount}`)).every(Boolean),
        repeatedTableHeader: rowCount < 100 || tableHeaderCount >= 2,
        clientTitle: normalizedText.includes("Профессиональная смета"),
        technicalAppendix: normalizedText.includes("Техническое приложение"),
        firstRow: normalizedText.includes("Профессиональная позиция 1") || rowCount === 1,
        lastRow: normalizedText.includes(lastTitle),
        allRowsInOrder,
        units: normalizedText.includes("м²") && (rowCount === 1 || normalizedText.includes("м³")),
        nullPriceHonest: rowCount !== 45 || (
          normalizedText.includes("Оценено частично")
          && normalizedText.includes("Строк без подтверждённой цены: 1")
          && normalizedText.includes("Полный итог: требуется уточнение цен")
        ),
        noUiNoise: !/developer mode|email|зел[её]н/u.test(normalizedText),
        durationWithinSlo: durationMs < 60_000,
        boundedCoordinatorMemory: rssDeltaBytes < 768 * 1024 * 1024,
      };
      const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
      invariant(failedChecks.length === 0, `R4_A6_PDF_${rowCount}_RED:${failedChecks.join(",")}`);
      cases.push({
        rowCount,
        pricedRowCount: projection.pricedRowCount,
        missingPriceRowCount: projection.missingPriceRowCount,
        grandTotalStatus: projection.grandTotalStatus,
        pageCount: extracted.pageCount,
        byteSize: pdf.byteLength,
        sha256: sha256(pdf),
        durationMs,
        rssDeltaBytes,
        checks,
      });
    }
  } finally {
    await browser.close();
  }
  const pageCounts = cases.map((item) => Number(item.pageCount));
  invariant(pageCounts.every((count, index) => index === 0 || count >= pageCounts[index - 1]),
    "R4_A6_PDF_PAGINATION_NON_MONOTONIC");
  atomicJson(resolve(outputRoot, "matrix.json"), {
    schemaVersion: "r568-r4-a6-professional-pdf-matrix.v1",
    capturedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source,
    generatorVersion: CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
    matrix: MATRIX,
    cases,
    gate: "GREEN_R4_A6_PRINT_PDF_PRODUCTION_GRADE",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
    productionReady: false,
    fakeGreenClaimed: false,
  });
  process.stdout.write(`${JSON.stringify({
    output: resolve(outputRoot, "matrix.json"),
    matrix: cases.map((item) => ({
      rowCount: item.rowCount,
      pageCount: item.pageCount,
      byteSize: item.byteSize,
      durationMs: item.durationMs,
      sha256: item.sha256,
    })),
    gate: "GREEN_R4_A6_PRINT_PDF_PRODUCTION_GRADE",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
