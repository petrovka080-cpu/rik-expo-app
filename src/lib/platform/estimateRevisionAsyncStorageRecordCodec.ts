import { strToU8, unzlibSync, zlibSync } from "fflate";
import { durableBase64ToBytes, durableBytesToBase64, durableUtf8BytesToString } from "./compactConsumerRepairDurableState";
import { estimateRevisionUtf8ByteLength, stableEstimateRevisionChecksum } from "./estimateRevisionDurableSerialization";
import { safeJsonParseValue } from "../format";

const SCHEMA = "estimate_revision_async_storage_record_zlib_v1";
export const ASYNC_STORAGE_RECORD_MAX_DECODED_BYTES = 2 * 1024 * 1024;

/** Storage representation only: decoded text, envelope checksums and CAS tokens stay exact. */
export function encodeEstimateRevisionAsyncStorageRecord(text: string): string {
  const rawByteLength = estimateRevisionUtf8ByteLength(text);
  if (rawByteLength < 32 * 1024 || rawByteLength > ASYNC_STORAGE_RECORD_MAX_DECODED_BYTES) return text;
  const compressed = zlibSync(strToU8(text), { level: 6 });
  const encoded = JSON.stringify({ schemaVersion: SCHEMA, codec: "zlib+base64", rawByteLength,
    compressedByteLength: compressed.length, rawChecksum: stableEstimateRevisionChecksum(text),
    payload: durableBytesToBase64(compressed) });
  // Small savings do not justify another representation.
  return estimateRevisionUtf8ByteLength(encoded) + 4096 < rawByteLength ? encoded : text;
}

export function decodeEstimateRevisionAsyncStorageRecord(text: string): string {
  const candidate = safeJsonParseValue<unknown>(text, null);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return text;
  const record = candidate as Record<string, unknown>;
  if (typeof record.schemaVersion !== "string" || !record.schemaVersion.startsWith("estimate_revision_async_storage_record_zlib_")) return text;
  const { rawByteLength, compressedByteLength, payload, rawChecksum } = record;
  if (record.schemaVersion !== SCHEMA || record.codec !== "zlib+base64"
    || typeof rawByteLength !== "number" || !Number.isSafeInteger(rawByteLength) || rawByteLength < 1 || rawByteLength > ASYNC_STORAGE_RECORD_MAX_DECODED_BYTES
    || typeof compressedByteLength !== "number" || !Number.isSafeInteger(compressedByteLength) || compressedByteLength < 1 || compressedByteLength > ASYNC_STORAGE_RECORD_MAX_DECODED_BYTES
    || typeof payload !== "string" || payload.length !== 4 * Math.ceil(compressedByteLength / 3)
    || typeof rawChecksum !== "string" || !/^[a-f0-9]{16}$/u.test(rawChecksum)) throw new Error("ASYNC_STORAGE_RECORD_CODEC_INVALID");
  const compressed = durableBase64ToBytes(payload);
  if (compressed.length !== compressedByteLength || durableBytesToBase64(compressed) !== payload) throw new Error("ASYNC_STORAGE_RECORD_CODEC_INVALID");
  const rawBytes = unzlibSync(compressed, { out: new Uint8Array(rawByteLength + 1) });
  if (rawBytes.length !== rawByteLength) throw new Error("ASYNC_STORAGE_RECORD_CODEC_SIZE_MISMATCH");
  const raw = durableUtf8BytesToString(rawBytes);
  if (estimateRevisionUtf8ByteLength(raw) !== rawByteLength || stableEstimateRevisionChecksum(raw) !== rawChecksum) throw new Error("ASYNC_STORAGE_RECORD_CODEC_CHECKSUM_MISMATCH");
  return raw;
}
