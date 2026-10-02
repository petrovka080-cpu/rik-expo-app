export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

export function canonicalizeForEstimateHash(value: unknown): CanonicalJsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? Number(value.toFixed(6)) : null;
  if (Array.isArray(value)) return value.map(canonicalizeForEstimateHash);
  if (typeof value === "object") {
    const result: { [key: string]: CanonicalJsonValue } = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = (value as Record<string, unknown>)[key];
      if (typeof next === "undefined") continue;
      result[key] = canonicalizeForEstimateHash(next);
    }
    return result;
  }
  return String(value);
}

export function stringifyCanonicalEstimateJson(value: unknown): string {
  return JSON.stringify(canonicalizeForEstimateHash(value));
}

function forEachCanonicalEstimateJsonChunk(
  value: unknown,
  emit: (chunk: string) => void,
): void {
  if (value === null || value === undefined) {
    emit("null");
    return;
  }
  if (typeof value === "string") {
    emit(JSON.stringify(value));
    return;
  }
  if (typeof value === "boolean") {
    emit(value ? "true" : "false");
    return;
  }
  if (typeof value === "number") {
    emit(Number.isFinite(value) ? JSON.stringify(Number(value.toFixed(6))) : "null");
    return;
  }
  if (Array.isArray(value)) {
    emit("[");
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) emit(",");
      forEachCanonicalEstimateJsonChunk(value[index], emit);
    }
    emit("]");
    return;
  }
  if (typeof value === "object") {
    emit("{");
    let emitted = 0;
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = (value as Record<string, unknown>)[key];
      if (typeof next === "undefined") continue;
      if (emitted > 0) emit(",");
      emit(JSON.stringify(key));
      emit(":");
      forEachCanonicalEstimateJsonChunk(next, emit);
      emitted += 1;
    }
    emit("}");
    return;
  }
  emit(JSON.stringify(String(value)));
}

const MAX_BUFFERED_CANONICAL_JSON_CHARS = 256 * 1024;
const MAX_BUFFERED_CANONICAL_JSON_CHUNKS = 16_384;

export function estimateDeterministicHash(value: unknown): string {
  // Hermes rejects very large strings even when the object itself fits in
  // memory. Domain packages can legitimately exceed that single-string
  // ceiling, so preserve the established hash algorithm while feeding it
  // canonical JSON in bounded chunks instead of materializing one huge value.
  // Most request/replay payloads are much smaller. Retaining a bounded set of
  // their already-produced chunks lets the length and canonical-order pass be
  // shared. Once either cap is crossed the chunks are discarded and the
  // established streaming traversal is repeated, so large Hermes inputs never
  // accumulate an aggregate JSON value or an unbounded chunk list.
  let textLength = 0;
  let bufferedChunks: string[] | null = [];
  forEachCanonicalEstimateJsonChunk(value, (chunk) => {
    textLength += chunk.length;
    if (!bufferedChunks) return;
    if (
      textLength > MAX_BUFFERED_CANONICAL_JSON_CHARS ||
      bufferedChunks.length >= MAX_BUFFERED_CANONICAL_JSON_CHUNKS
    ) {
      bufferedChunks = null;
      return;
    }
    bufferedChunks.push(chunk);
  });
  let h1 = 0xdeadbeef ^ textLength;
  let h2 = 0x41c6ce57 ^ textLength;
  const hashChunk = (chunk: string) => {
    // Hashing is byte-order-equivalent to the former 64 KiB buffer. Feeding
    // each already-bounded canonical chunk directly avoids repeatedly
    // concatenating short strings into a large temporary rope.
    for (let index = 0; index < chunk.length; index += 1) {
      const code = chunk.charCodeAt(index);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
  };
  if (bufferedChunks) {
    for (const chunk of bufferedChunks) hashChunk(chunk);
  } else {
    forEachCanonicalEstimateJsonChunk(value, hashChunk);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const high = (h2 >>> 0).toString(16).padStart(8, "0");
  const low = (h1 >>> 0).toString(16).padStart(8, "0");
  return `eh_${high}${low}`;
}
