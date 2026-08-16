import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  HVAC_R4_OFFICIAL_SOURCES,
} from "./hvacR4Model";
import {
  assertExact,
  atomicWrite,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
} from "./support";

const SNAPSHOT_AT = "2026-08-16T05:10:00.000Z";

function htmlText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfLinks(html: string, base: string): string[] {
  const result = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi)) {
    const resolved = new URL(match[1]!, base);
    if (resolved.protocol === "https:" && resolved.hostname === "minstroy.gov.kg") result.add(resolved.href);
  }
  return [...result].sort();
}

async function exactFetch(url: string): Promise<{ finalUrl: string; status: number; contentType: string; body: Buffer }> {
  const parsed = new URL(url);
  assertExact(parsed.protocol === "https:" && parsed.hostname === "minstroy.gov.kg", `HVAC_OFFICIAL_HOST_RED:${url}`);
  const response = await fetch(parsed, {
    headers: { "user-agent": "RIK-BATCH007-HVAC-R4-EVIDENCE/1.0" },
    redirect: "follow",
  });
  const final = new URL(response.url);
  assertExact(final.protocol === "https:" && final.hostname === "minstroy.gov.kg", `HVAC_OFFICIAL_REDIRECT_HOST_RED:${response.url}`);
  const body = Buffer.from(await response.arrayBuffer());
  return {
    finalUrl: final.href,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body,
  };
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const snapshotDirectory = join(evidenceRoot, "03-norms", "official-snapshots");
  mkdirSync(snapshotDirectory, { recursive: true });
  const rows = [];
  for (const source of HVAC_R4_OFFICIAL_SOURCES) {
    const page = await exactFetch(source.officialUrl);
    assertExact(page.status === 200 && page.body.length > 1_000, `HVAC_OFFICIAL_PAGE_RED:${source.sourceId}:${page.status}`);
    const pageHtml = page.body.toString("utf8");
    const links = pdfLinks(pageHtml, page.finalUrl);
    assertExact(links.length === 1, `HVAC_OFFICIAL_PDF_LINK_CARDINALITY_RED:${source.sourceId}:${links.length}`);
    const pdf = await exactFetch(links[0]!);
    assertExact(pdf.status === 200 && pdf.body.subarray(0, 5).toString("ascii") === "%PDF-", `HVAC_OFFICIAL_PDF_RED:${source.sourceId}:${pdf.status}`);
    const pagePath = join(snapshotDirectory, `${source.sourceId}.html`);
    const pdfPath = join(snapshotDirectory, `${source.sourceId}.pdf`);
    atomicWrite(pagePath, page.body);
    atomicWrite(pdfPath, pdf.body);
    const visibleText = htmlText(pageHtml);
    const row = {
      schemaVersion: "hvac-r4-official-source-snapshot.v1",
      sourceId: source.sourceId,
      documentCode: source.documentCode,
      titleRu: source.titleRu,
      authority: source.authority,
      role: source.role,
      routeStatus: source.status,
      officialPageUrl: source.officialUrl,
      resolvedPageUrl: page.finalUrl,
      pageHttpStatus: page.status,
      pageContentType: page.contentType,
      pageBytes: page.body.length,
      pageSha256: sha256(page.body),
      visibleTextSha256: sha256(visibleText),
      officialPdfUrl: pdf.finalUrl,
      pdfHttpStatus: pdf.status,
      pdfContentType: pdf.contentType,
      pdfBytes: pdf.body.length,
      pdfSha256: sha256(pdf.body),
      pdfMagic: pdf.body.subarray(0, 5).toString("ascii"),
      pageSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.html`,
      pdfSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.pdf`,
      retrievedAt: SNAPSHOT_AT,
      priceOrRateSelectionPolicy: "NO_RATE_OR_PRICE_IS_INVENTED; EXACT_TABLE_CODE_AND_CURRENT_PRICE_SNAPSHOT_REMAIN_TYPED_INPUT_REQUIRED",
      status: "GREEN_OFFICIAL_PAGE_AND_PDF_SNAPSHOT",
    };
    rows.push({ ...row, rowSha256: semanticSha256(row) });
  }
  writeFileSync(join(evidenceRoot, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, { encoding: "utf8", flush: true });
  writeJson("03-norms/OFFICIAL_SOURCE_SNAPSHOT_SUMMARY.json", {
    schemaVersion: "hvac-r4-official-source-snapshot-summary.v1",
    generatedAt: SNAPSHOT_AT,
    sources: rows.length,
    pageHttp200: rows.filter((row) => row.pageHttpStatus === 200).length,
    pdfHttp200: rows.filter((row) => row.pdfHttpStatus === 200).length,
    pdfMagicValid: rows.filter((row) => row.pdfMagic === "%PDF-").length,
    duplicatePageHashes: rows.length - new Set(rows.map((row) => row.pageSha256)).size,
    duplicatePdfHashes: rows.length - new Set(rows.map((row) => row.pdfSha256)).size,
    sourceIdSetSha256: sha256(rows.map((row) => row.sourceId).sort().join("\n")),
    registrySha256: semanticSha256(rows),
    productionWrites: 0,
    status: rows.every((row) => row.status === "GREEN_OFFICIAL_PAGE_AND_PDF_SNAPSHOT") ? "GREEN" : "RED",
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
