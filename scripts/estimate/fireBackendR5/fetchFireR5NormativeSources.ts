import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { FIRE_R5_OFFICIAL_SOURCES } from "./fireR5Sources";
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

const SNAPSHOT_AT = "2026-08-17T00:05:00.000Z";
const ALLOWED_HOSTS = new Set(["minstroy.gov.kg", "cbd.minjust.gov.kg", "eec.eaeunion.org"]);

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
  assertExact(parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname), `FIRE_OFFICIAL_HOST_RED:${url}`);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(parsed, {
        headers: { "user-agent": "RIK-BATCH009-FIRE-R5-EVIDENCE/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(120_000),
      });
      const final = new URL(response.url);
      assertExact(final.protocol === "https:" && ALLOWED_HOSTS.has(final.hostname), `FIRE_OFFICIAL_REDIRECT_HOST_RED:${response.url}`);
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
  for (const source of FIRE_R5_OFFICIAL_SOURCES) {
    const page = await exactFetch(source.officialPageUrl);
    assertExact(page.status === 200 && page.body.length > 1_000, `FIRE_OFFICIAL_PAGE_RED:${source.sourceId}:${page.status}`);
    const html = page.body.toString("utf8");
    const links = source.contentKind === "PDF" ? pdfLinks(html, page.finalUrl) : [];
    const pdfUrl = source.contentKind === "PDF" ? source.directPdfUrl ?? links[0] : undefined;
    assertExact(source.contentKind === "HTML" || Boolean(pdfUrl), `FIRE_OFFICIAL_PDF_LINK_MISSING:${source.sourceId}`);
    const pdf = pdfUrl ? await exactFetch(pdfUrl) : null;
    assertExact(!pdf || (pdf.status === 200 && pdf.body.subarray(0, 5).toString("ascii") === "%PDF-"), `FIRE_OFFICIAL_PDF_RED:${source.sourceId}:${pdf?.status}`);
    const pagePath = join(snapshotDirectory, `${source.sourceId}.html`);
    const pdfPath = join(snapshotDirectory, `${source.sourceId}.pdf`);
    const textPath = join(snapshotDirectory, `${source.sourceId}.txt`);
    atomicWrite(pagePath, page.body);
    const visibleText = htmlText(html);
    atomicWrite(textPath, `${visibleText}\n`);
    if (pdf) atomicWrite(pdfPath, pdf.body);
    const row = {
      schemaVersion: "batch009-fire-r5-official-source-snapshot.v1",
      ...source,
      resolvedPageUrl: page.finalUrl,
      pageHttpStatus: page.status,
      pageContentType: page.contentType,
      pageBytes: page.body.length,
      pageSha256: sha256(page.body),
      visibleTextSha256: sha256(visibleText),
      discoveredPdfLinks: links,
      officialPdfUrl: pdf?.finalUrl ?? null,
      pdfHttpStatus: pdf?.status ?? null,
      pdfContentType: pdf?.contentType ?? null,
      pdfBytes: pdf?.body.length ?? 0,
      pdfSha256: pdf ? sha256(pdf.body) : null,
      pdfMagic: pdf?.body.subarray(0, 5).toString("ascii") ?? null,
      pageSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.html`,
      textSnapshotRelativePath: `03-norms/official-snapshots/${source.sourceId}.txt`,
      pdfSnapshotRelativePath: pdf ? `03-norms/official-snapshots/${source.sourceId}.pdf` : null,
      retrievedAt: SNAPSHOT_AT,
      statusProof: "GREEN_OFFICIAL_PAGE_AND_PDF_REDOWNLOADED",
    };
    rows.push({ ...row, rowSha256: semanticSha256(row) });
    process.stdout.write(`${source.sourceId} ${source.contentKind} ${pdf?.body.length ?? page.body.length} ${pdf ? sha256(pdf.body) : sha256(page.body)}\n`);
  }
  writeJsonl("03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl", rows);
  writeJson("03-norms/OFFICIAL_SOURCE_SNAPSHOT_SUMMARY.json", {
    schemaVersion: "batch009-fire-r5-official-source-snapshot-summary.v1",
    generatedAt: SNAPSHOT_AT,
    sources: rows.length,
    pageHttp200: rows.filter((row) => row.pageHttpStatus === 200).length,
    htmlSources: rows.filter((row) => row.contentKind === "HTML").length,
    pdfSources: rows.filter((row) => row.contentKind === "PDF").length,
    pdfHttp200: rows.filter((row) => row.contentKind === "PDF" && row.pdfHttpStatus === 200).length,
    pdfMagicValid: rows.filter((row) => row.contentKind === "PDF" && row.pdfMagic === "%PDF-").length,
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
