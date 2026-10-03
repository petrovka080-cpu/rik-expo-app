export const ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES = {
  memory: 16 * 1024 * 1024,
  asyncStorage: 16 * 1024 * 1024,
  indexedDb: 24 * 1024 * 1024,
  sqlite: 32 * 1024 * 1024,
} as const;

export const MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES =
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory;

export const MAX_ESTIMATE_REVISION_DURABLE_RECORD_BYTES =
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite * 2 + 64 * 1024;

export function stableEstimateRevisionChecksum(value: string): string {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function estimateRevisionUtf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length
    ) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
