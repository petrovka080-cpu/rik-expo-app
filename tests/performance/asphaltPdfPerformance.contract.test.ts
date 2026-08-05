import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";

import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  ensureConsumerRepairRequestPdfAvailable,
  selectConsumerRepairRoadScopeV4,
} from "../../src/lib/consumerRequests";
import { getConsumerRepairPdfStorageObject } from "../../src/lib/consumerRequests/consumerRequestPdfStorage";
import { normalizeRuText } from "../../src/lib/text/encoding";

const PROMPT =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 5400 метров длина и 15 метров ширина";
const OUTPUT_PATH = path.join(
  process.cwd(),
  ".release-runtime",
  "asphalt-reference-v1-closeout",
  "pdf-performance-node.json",
);

type ScopeMetric = {
  scope: "ROAD_SURFACING_ONLY" | "FULL_ROAD_INFRASTRUCTURE";
  rows: number;
  cold_generation_ms: number;
  warm_lookup_p50_ms: number;
  warm_lookup_p95_ms: number;
  pdf_bytes: number;
  generated_pdf_records: number;
  immutable_pdf_id_reused: boolean;
  storage_object_reused: boolean;
};

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return Number((sorted[index] ?? 0).toFixed(3));
}

function measureScope(
  scope: ScopeMetric["scope"],
  expectedRows: number,
): ScopeMetric {
  __resetConsumerRepairRequestStoreForTests();
  const userId = `pdf-performance-${scope.toLowerCase()}`;
  const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
    consumerUserId: userId,
    problemText: PROMPT,
    repairType: "road_construction",
    city: "Бишкек",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    selectedWork: null,
  });
  const selected = selectConsumerRepairRoadScopeV4({
    requestDraftId: bundle.draft.id,
    userId,
    selectedScope: scope,
    createdAt: "2026-07-27T00:00:00.000Z",
  });
  expect(selected.items).toHaveLength(expectedRows);

  const coldStartedAt = performance.now();
  const first = ensureConsumerRepairRequestPdfAvailable({
    requestDraftId: selected.draft.id,
    userId,
    generatedAt: "2026-07-27T00:00:00.000Z",
  });
  const coldGenerationMs = performance.now() - coldStartedAt;
  const firstPdf = first.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  if (!firstPdf) throw new Error(`PDF_PERFORMANCE_GENERATED_PDF_MISSING:${scope}`);
  const storageBefore = getConsumerRepairPdfStorageObject({
    storageBucket: firstPdf.storageBucket,
    storageKey: firstPdf.storageKey,
  });
  if (!storageBefore) throw new Error(`PDF_PERFORMANCE_STORAGE_MISSING:${scope}`);

  const warmDurations: number[] = [];
  let last = first;
  for (let index = 0; index < 20; index += 1) {
    const warmStartedAt = performance.now();
    last = ensureConsumerRepairRequestPdfAvailable({
      requestDraftId: selected.draft.id,
      userId,
    });
    warmDurations.push(performance.now() - warmStartedAt);
  }
  const lastPdf = last.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  const storageAfter = lastPdf
    ? getConsumerRepairPdfStorageObject({
        storageBucket: lastPdf.storageBucket,
        storageKey: lastPdf.storageKey,
      })
    : null;

  return {
    scope,
    rows: selected.items.length,
    cold_generation_ms: Number(coldGenerationMs.toFixed(3)),
    warm_lookup_p50_ms: percentile(warmDurations, 0.5),
    warm_lookup_p95_ms: percentile(warmDurations, 0.95),
    pdf_bytes: storageBefore.body.length,
    generated_pdf_records: last.pdfs.filter((pdf) => pdf.pdfStatus === "generated").length,
    immutable_pdf_id_reused: lastPdf?.id === firstPdf.id,
    storage_object_reused:
      storageAfter?.uploadedAt === storageBefore.uploadedAt
      && storageAfter?.body === storageBefore.body,
  };
}

describe("Asphalt Reference V1 PDF generation performance", () => {
  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("meets cold 54/702 and warm immutable-reuse budgets", () => {
    const metrics = [
      measureScope("ROAD_SURFACING_ONLY", 54),
      measureScope("FULL_ROAD_INFRASTRUCTURE", 702),
    ];
    const blockers = metrics.flatMap((metric) => [
      metric.cold_generation_ms
        > (metric.scope === "ROAD_SURFACING_ONLY" ? 1_500 : 2_500)
        ? `${metric.scope}:cold_generation_budget`
        : "",
      metric.warm_lookup_p95_ms > 500
        ? `${metric.scope}:warm_lookup_budget`
        : "",
      metric.generated_pdf_records !== 1
        ? `${metric.scope}:repeated_generation`
        : "",
      !metric.immutable_pdf_id_reused
        ? `${metric.scope}:pdf_identity_changed`
        : "",
      !metric.storage_object_reused
        ? `${metric.scope}:storage_object_changed`
        : "",
    ]).filter(Boolean);
    const result = {
      schema_version: "AsphaltReferenceV1PdfPerformanceNodeV1",
      measured_at: new Date().toISOString(),
      metrics,
      blockers,
      final_status:
        blockers.length === 0
          ? "GREEN_ASPHALT_REFERENCE_V1_PDF_GENERATION_AND_REUSE_BUDGETS"
          : "STOP_ASPHALT_REFERENCE_V1_PDF_GENERATION_AND_REUSE_BUDGETS",
    };
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

    expect(blockers).toEqual([]);
  });

  it("is independently parseable with FlateDecode and preserves every 54-row UI title", async () => {
    const userId = "pdf-external-parser";
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: userId,
      problemText: PROMPT,
      repairType: "road_construction",
      city: "Р‘РёС€РєРµРє",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const selected = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId,
      selectedScope: "ROAD_SURFACING_ONLY",
      createdAt: "2026-07-27T00:00:00.000Z",
    });
    const generated = ensureConsumerRepairRequestPdfAvailable({
      requestDraftId: selected.draft.id,
      userId,
      generatedAt: "2026-07-27T00:00:00.000Z",
    });
    const pdf = generated.pdfs.find((candidate) => candidate.pdfStatus === "generated");
    if (!pdf) throw new Error("PDF_EXTERNAL_PARSER_GENERATED_PDF_MISSING");
    const stored = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });
    if (!stored) throw new Error("PDF_EXTERNAL_PARSER_STORAGE_MISSING");
    expect(stored.body).toContain("/FlateDecode");

    const externalParserScript = `
      import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const document = await getDocument({
        data: new Uint8Array(bytes),
        disableWorker: true,
        verbosity: 0,
      }).promise;
      const pageTexts = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pageTexts.push(content.items.map((item) => item.str ?? "").join(" "));
      }
      process.stdout.write(JSON.stringify({ pages: document.numPages, text: pageTexts.join(" ") }));
      await document.destroy();
    `;
    const externalOutput = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", externalParserScript],
      {
        cwd: process.cwd(),
        input: Buffer.from(stored.body, "latin1"),
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    const parsed = JSON.parse(externalOutput) as { pages: number; text: string };
    const parsedText = String(normalizeRuText(parsed.text) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const uniqueUiTitles = [...new Set(
      selected.items.map((item) =>
        String(normalizeRuText(item.titleRu) ?? "").replace(/\s+/g, " ").trim()
      ),
    )].filter(Boolean);
    const parsedUiTitles = uniqueUiTitles.filter((title) => parsedText.includes(title));

    expect(parsed.pages).toBeGreaterThan(0);
    expect(parsedText).toMatch(/[А-Яа-яЁё]/);
    expect(selected.items).toHaveLength(54);
    expect(parsedUiTitles).toHaveLength(uniqueUiTitles.length);
    expect(pdf.revisionId).toBe(generated.estimateRevisionState?.current_revision_id);
    expect(pdf.revisionFullSnapshotHash).toBe(
      generated.estimateRevisionState?.revisions.find(
        (revision) => revision.revision_id === pdf.revisionId,
      )?.full_snapshot_hash,
    );
  });
});
