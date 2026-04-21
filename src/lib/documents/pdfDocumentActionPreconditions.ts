import type { DocumentDescriptor } from "./pdfDocument";
import type { PdfSource } from "../pdfFileContract";

export function extractUriScheme(uri: unknown): string {
  return (
    String(uri || "")
      .match(/^([a-z0-9+.-]+):/i)?.[1]
      ?.toLowerCase() || ""
  );
}

export function requiresCanonicalRemotePdfSource(
  args: Pick<DocumentDescriptor, "documentType" | "originModule">,
): boolean {
  const key = `${args.originModule}:${args.documentType}`;
  return (
    key === "foreman:request" ||
    key === "director:director_report" ||
    key === "director:supplier_summary" ||
    key === "warehouse:warehouse_document" ||
    key === "warehouse:warehouse_register" ||
    key === "warehouse:warehouse_materials"
  );
}

export function assertCanonicalRemotePdfSource(
  descriptor: Pick<DocumentDescriptor, "documentType" | "originModule">,
  source: PdfSource,
): void {
  if (!requiresCanonicalRemotePdfSource(descriptor)) return;
  if (source.kind === "remote-url") return;
  throw new Error(
    `Canonical ${descriptor.originModule} ${descriptor.documentType} PDF must use backend remote-url source`,
  );
}

export function hasPdfDocumentPreviewRouter(router: unknown): boolean {
  return Boolean(router);
}

export function canUsePdfDocumentDirectPreviewFallback(args: {
  hasRouter: boolean;
}): boolean {
  return !args.hasRouter;
}

