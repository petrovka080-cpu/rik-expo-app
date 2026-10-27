export function createDocumentContentHash(input: {
  id: string;
  mimeType: string;
  byteSize: number;
  pageCount?: number;
  textHint?: string;
}): string {
  const seed = `${input.id}|${input.mimeType}|${input.byteSize}|${input.pageCount ?? 0}|${input.textHint ?? ""}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `doc-sha256-${hash.toString(16).padStart(8, "0")}`;
}
