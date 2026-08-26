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

function canonicalEstimateJsonLength(value: unknown): number {
  if (value === null || value === undefined) return 4;
  if (typeof value === "string") return JSON.stringify(value).length;
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? JSON.stringify(Number(value.toFixed(6))).length
      : 4;
  }
  if (Array.isArray(value)) {
    let length = 2 + Math.max(0, value.length - 1);
    for (const item of value) length += canonicalEstimateJsonLength(item);
    return length;
  }
  if (typeof value === "object") {
    let length = 2;
    let emitted = 0;
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const next = (value as Record<string, unknown>)[key];
      if (typeof next === "undefined") continue;
      if (emitted > 0) length += 1;
      length += JSON.stringify(key).length + 1 + canonicalEstimateJsonLength(next);
      emitted += 1;
    }
    return length;
  }
  return JSON.stringify(String(value)).length;
}

export function estimateDeterministicHash(value: unknown): string {
  // Hermes rejects very large strings even when the object itself fits in
  // memory. Domain packages can legitimately exceed that single-string
  // ceiling, so preserve the established hash algorithm while feeding it
  // canonical JSON in bounded chunks instead of materializing one huge value.
  const textLength = canonicalEstimateJsonLength(value);
  let h1 = 0xdeadbeef ^ textLength;
  let h2 = 0x41c6ce57 ^ textLength;
  let buffered = "";
  const flush = () => {
    for (let index = 0; index < buffered.length; index += 1) {
      const code = buffered.charCodeAt(index);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
    buffered = "";
  };
  forEachCanonicalEstimateJsonChunk(value, (chunk) => {
    buffered += chunk;
    if (buffered.length >= 64 * 1024) flush();
  });
  if (buffered.length > 0) flush();
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const high = (h2 >>> 0).toString(16).padStart(8, "0");
  const low = (h1 >>> 0).toString(16).padStart(8, "0");
  return `eh_${high}${low}`;
}
