import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { CONCRETE_R5_OFFICIAL_SOURCES } from "./concreteR5Sources";
import {
  assertExact,
  atomicWrite,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

const SNAPSHOT_AT = "2026-08-16T16:05:00.000Z";

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
  assertExact(parsed.protocol === "https:" && parsed.hostname === "minstroy.gov.kg", `CONCRETE_OFFICIAL_HOST_RED:${url}`);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(parsed, {
        headers: { "user-agent": "RIK-BATCH008-CONCRETE-R5-EVIDENCE/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(120_000),
      });
      const final = new URL(response.url);
      assertExact(final.protocol === "https:" && final.hostname === "minstroy.gov.kg", `CONCRETE_OFFICIAL_REDIRECT_HOST_RED:${response.url}`);
      return {
        finalUrl: final.href,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body: Buffer.from(await response.arrayBuffer()),
      };
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const snapshotDirectory = join(evidenceRoot, "03-norms", "official-snapshots");
  mkdirSync(snapshotDirectory, { recursive: true });
  const rows = [];
  for (const source of CONCRETE_R5_OFFICIAL_SOURCES) {
    const page = await exactFetch(source.officialPageUrl);
    assertExact(page.status === 200 && page.body.length > 1_000, `CONCRETE_OFFICIAL_PAGE_RED:${source.sourceId}:${page.status}`);
    const html = page.body.toString("utf8");
    const links = pdfLinks(html, page.finalUrl);
    const pdfUrl = source.directPdfUrl ?? links[0];
    assertExact(Boolean(pdfUrl), `CONCRETE_OFFICIAL_PDF_LINK_MISSING:${source.sourceId}`);
    const pdf = await exactFetch(pdfUrl!);
    assertExact(pdf.status === 200 && pdf.body.subarray(0, 5).toString("ascii") === "%PDF-", `CONCRETE_OFFICIAL_PDF_RED:${source.sourceId}:${pdf.status}`);
    const pagePath = join(snapshotDirectory, `${source.sourceId}.html`);
    const pdfPath = join(snapshotDirectory, `${source.sourceId}.pdf`);
    atomicWrite(pagePath, page.body);
    atomicWrite(pdfPath, pdf.body);
    const visibleText = htmlText(html);
    const row = {
      schemaVersion: "batch008-concrete-r5-official-source-snapshot.v1",
      ...source,
      resolvedPageUrl: page.finalUrl,
      pageHttpStatus: page.status,
      pageContentType: page.contentType,
      pageBytes: page.body.length,
      pageSha256: sha256(page.body),
      visibleTextSha256: sha256(visibleText),
      discoveredPdfLinks: links,
      officialPdfUrl: pdf.finalUrl,
      pdfHttpStatus: pdf.status,
      pdfContentType: pdf.contentType,
      pdfBytes: pdf.body.length,
      pdfSha256: sha256(pdf.body),
      pdfMagic: pdf.body.subarray(0, 5).toString("ascii"),
      pageSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.html`,
      pdfSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.pdf`,
      retrievedAt: SNAPSHOT_AT,
      statusProof: "GREEN_OFFICIAL_PAGE_AND_PDF_REDOWNLOADED",
    };
    rows.push({ ...row, rowSha256: semanticSha256(row) });
    process.stdout.write(`${source.sourceId} ${pdf.body.length} ${sha256(pdf.body)}\n`);
  }
  writeJsonl("03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl", rows);
  writeJson("03-norms/OFFICIAL_SOURCE_SNAPSHOT_SUMMARY.json", {
    schemaVersion: "batch008-concrete-r5-official-source-snapshot-summary.v1",
    generatedAt: SNAPSHOT_AT,
    sources: rows.length,
    pageHttp200: rows.filter((row) => row.pageHttpStatus === 200).length,
    pdfHttp200: rows.filter((row) => row.pdfHttpStatus === 200).length,
    pdfMagicValid: rows.filter((row) => row.pdfMagic === "%PDF-").length,
    sourceIdSetSha256: sha256(rows.map((row) => row.sourceId).sort().join("\n")),
    registrySha256: semanticSha256(rows),
    productionWrites: 0,
    status: "GREEN",
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
