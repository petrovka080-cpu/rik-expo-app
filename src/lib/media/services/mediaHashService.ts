export type MediaHashInput = {
  id: string;
  mimeType: string;
  byteSize: number;
  durationMs?: number;
};

export function createMediaContentHash(input: MediaHashInput): string {
  const seed = `${input.id}:${input.mimeType}:${input.byteSize}:${input.durationMs ?? 0}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mh_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
