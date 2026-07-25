import {
  MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
  createDurableEnvelope,
  estimateRevisionUtf8ByteLength,
  parseDurableEnvelopeBundle,
  serializeRevisionBundle,
  stableEstimateRevisionChecksum,
  type DurableEnvelope,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore.contract";

const key = "safe-json-estimate";
const validBundle = {
  draft: {
    id: key,
    consumerUserId: "user-1",
    status: "draft",
    title: "Safe JSON",
    problemText: "Safe JSON",
    repairType: "test",
    missingData: [],
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
  },
  items: [],
  media: [],
  pdfs: [],
  projectExecutionDrafts: [],
  marketplaceLink: {
    id: "safe-json-marketplace-link",
    requestDraftId: key,
    status: "not_sent",
    createdAt: "2026-07-25T00:00:00.000Z",
  },
  events: [],
} satisfies RevisionBundle;

const envelopeFor = (serializedBundle: string): DurableEnvelope =>
  createDurableEnvelope({
    key,
    version: "revision-1",
    previousVersion: null,
    serializedBundle,
    checksum: stableEstimateRevisionChecksum(serializedBundle),
  });

describe("estimate revision safe JSON boundary", () => {
  it("accepts a checksum-valid supported envelope", () => {
    expect(
      parseDurableEnvelopeBundle(
        envelopeFor(JSON.stringify(validBundle)),
        key,
      )?.draft.id,
    ).toBe(key);
  });

  it.each([
    ["malformed JSON", "{"],
    ["truncated JSON", '{"draft":{"id":"safe-json-estimate"'],
    ["incorrect schema", JSON.stringify({ unexpected: true })],
    ["unexpected primitive", "42"],
  ])("controlled-fails %s", (_label, serialized) => {
    expect(parseDurableEnvelopeBundle(envelopeFor(serialized), key)).toBeNull();
  });

  it.each([
    "estimate_revision_durable_envelope_v0",
    "estimate_revision_durable_envelope_v2",
  ])("rejects unsupported or legacy envelope version %s", (schemaVersion) => {
    expect(
      parseDurableEnvelopeBundle(
        {
          ...envelopeFor(JSON.stringify(validBundle)),
          schemaVersion,
        },
        key,
      ),
    ).toBeNull();
  });

  it("rejects a corrupted checksum", () => {
    expect(
      parseDurableEnvelopeBundle(
        {
          ...envelopeFor(JSON.stringify(validBundle)),
          checksum: "corrupted",
        },
        key,
      ),
    ).toBeNull();
  });

  it("rejects oversized payload before parsing", () => {
    const serialized = JSON.stringify({
      ...validBundle,
      oversized: "x".repeat(
        MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
      ),
    });
    expect(serialized.length).toBeGreaterThan(
      MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
    );
    expect(
      parseDurableEnvelopeBundle(envelopeFor(serialized), key),
    ).toBeNull();
  });

  it("measures the limit in UTF-8 bytes rather than UTF-16 code units", () => {
    const serialized = JSON.stringify({
      ...validBundle,
      oversized: "Ж".repeat(
        Math.floor(MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES / 2),
      ),
    });
    expect(serialized.length).toBeLessThan(
      MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
    );
    expect(estimateRevisionUtf8ByteLength(serialized)).toBeGreaterThan(
      MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
    );
    expect(
      parseDurableEnvelopeBundle(envelopeFor(serialized), key),
    ).toBeNull();
  });

  it("rejects an oversized bundle at the write boundary", () => {
    const oversizedBundle: RevisionBundle & { oversized: string } = {
      ...validBundle,
      oversized: "x".repeat(
        MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
      ),
    };
    expect(() =>
      serializeRevisionBundle(oversizedBundle),
    ).toThrow("REVISION_BUNDLE_SERIALIZATION_TOO_LARGE");
  });
});
