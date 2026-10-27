/** @jest-environment jsdom */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildPdfViewerWebFallbackHtml, needsPdfJsWebFallback } from "./pdfViewerWebFallback";
import type { DocumentAsset } from "../documents/pdfDocumentSessions";

describe("PDF display without the browser PDF plugin", () => {
  const asset = { mimeType: "application/pdf", fileName: "estimate.pdf" } as DocumentAsset;
  afterEach(() => { delete (navigator as unknown as Record<string, unknown>).pdfViewerEnabled; });

  it("keeps a supported browser and existing HTML preview on their normal paths", () => {
    Object.defineProperty(navigator, "pdfViewerEnabled", { configurable: true, value: true });
    expect(needsPdfJsWebFallback(asset, "blob:existing-pdf")).toBe(false);
    expect(needsPdfJsWebFallback({ ...asset, documentType: "request", source: "generated" }, "blob:estimate-pdf")).toBe(true);
    Object.defineProperty(navigator, "pdfViewerEnabled", { configurable: true, value: false });
    expect(needsPdfJsWebFallback(asset, "blob:existing-pdf")).toBe(true);
    expect(needsPdfJsWebFallback(asset, "data:text/html,<table>estimate</table>")).toBe(false);
  });

  it("cannot turn document URI or render identity into injected HTML", () => {
    const injected = '</script><img id="injected" src=x onerror="alert(1)"><script>';
    const html = buildPdfViewerWebFallbackHtml(injected, injected, "http://localhost:8081");
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector("#injected")).toBeNull();
    expect(document.querySelectorAll("script")).toHaveLength(1);
    const config = document.querySelector("script")!.textContent!.match(/const config=(.*);/)!;
    expect(JSON.parse(config[1])).toEqual({ uri: injected, renderInstanceKey: injected, parentOrigin: "http://localhost:8081" });
  });

  it("serves matching pinned library and worker bytes locally with their license", () => {
    const digest = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    for (const file of ["pdf.mjs", "pdf.worker.mjs"]) {
      expect(digest(`public/pdfjs/${file}`)).toBe(digest(`node_modules/pdfjs-dist/build/${file}`));
    }
    expect(fs.readFileSync("public/pdfjs/LICENSE")).toEqual(fs.readFileSync("node_modules/pdfjs-dist/LICENSE"));
    for (const directory of ["wasm", "cmaps", "standard_fonts"]) {
      for (const file of fs.readdirSync(`node_modules/pdfjs-dist/${directory}`)) {
        expect(digest(`public/pdfjs/${directory}/${file}`)).toBe(digest(`node_modules/pdfjs-dist/${directory}/${file}`));
      }
    }
  });
});
