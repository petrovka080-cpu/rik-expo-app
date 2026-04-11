import { hashString32 } from "../pdfFileContract";

export type PdfViewerRenderInstanceKeyInput = {
  platform: string;
  sessionId?: string | null;
  assetId?: string | null;
  uri?: string | null;
  renderUri?: string | null;
  renderer?: string | null;
  loadAttempt?: number | null;
};

const trimText = (value: unknown) => String(value ?? "").trim();

const keyPart = (value: unknown, fallback: string) => {
  const text = trimText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return text || fallback;
};

export function createPdfViewerRenderInstanceKey(
  input: PdfViewerRenderInstanceKeyInput,
) {
  const platform = keyPart(input.platform, "unknown");
  const sessionId = keyPart(input.sessionId, "direct");
  const assetId = keyPart(input.assetId, "asset");
  const renderer = keyPart(input.renderer, "renderer");
  const loadAttempt = Number.isFinite(Number(input.loadAttempt))
    ? Math.max(0, Number(input.loadAttempt))
    : 0;
  const uriHash = hashString32(trimText(input.uri) || "missing-uri");
  const renderUriHash = hashString32(
    trimText(input.renderUri) || trimText(input.uri) || "missing-render-uri",
  );

  return [
    "pdf-render",
    platform,
    sessionId,
    assetId,
    renderer,
    String(loadAttempt),
    uriHash,
    renderUriHash,
  ].join(":");
}
