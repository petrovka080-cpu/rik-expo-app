import {
  buildForemanRequestClientSourceFingerprint,
  buildForemanRequestManifestContract,
} from "./foremanRequestPdf.shared";

const baseSourceModel = {
  requestLabel: "REQ-001",
  comment: "Bring materials",
  foremanName: "Ivan",
  metaFields: [
    { label: "Object", value: "Tower A" },
    { label: "Status", value: "Pending" },
  ],
  rows: [
    {
      name: "Concrete",
      uom: "m3",
      qtyText: "12",
      status: "Pending",
      note: "Need tomorrow",
    },
    {
      name: "Rebar",
      uom: "kg",
      qtyText: "40",
      status: "Pending",
      note: "",
    },
  ],
};

describe("foreman request manifest contract (PDF-Z4)", () => {
  it("keeps the same client fingerprint for the same request snapshot", () => {
    const first = buildForemanRequestClientSourceFingerprint({
      requestId: "req-1",
      displayNo: "REQ-001",
      status: "pending",
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T09:00:00.000Z",
      objectName: "Tower A",
    });
    const second = buildForemanRequestClientSourceFingerprint({
      requestId: "req-1",
      displayNo: "REQ-001",
      status: "pending",
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T09:00:00.000Z",
      objectName: "Tower A",
    });

    expect(second).toBe(first);
  });

  it("changes the client fingerprint when meaningful request state changes", () => {
    const first = buildForemanRequestClientSourceFingerprint({
      requestId: "req-1",
      displayNo: "REQ-001",
      status: "pending",
      updatedAt: "2026-04-20T09:00:00.000Z",
      objectName: "Tower A",
    });
    const changed = buildForemanRequestClientSourceFingerprint({
      requestId: "req-1",
      displayNo: "REQ-001",
      status: "approved",
      updatedAt: "2026-04-20T09:10:00.000Z",
      objectName: "Tower A",
    });

    expect(changed).not.toBe(first);
  });

  it("ignores transport and timing noise in server source versions", async () => {
    const first = await buildForemanRequestManifestContract({
      requestId: "req-1",
      sourceModel: baseSourceModel,
      fileName: "request_REQ_001_req-1.pdf",
    });
    const noisy = await buildForemanRequestManifestContract({
      requestId: "req-1",
      sourceModel: {
        ...baseSourceModel,
        generatedAt: "2026-04-20T10:00:00.000Z",
        telemetry: { traceId: "trace-1" },
        rows: baseSourceModel.rows.map((row, index) => ({
          ...row,
          signedUrl: `https://example.com/${index}.pdf`,
          durationMs: 100 + index,
        })),
      },
      fileName: "request_REQ_001_req-1.pdf",
    });

    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });

  it("builds deterministic source and artifact versions for artifact reuse", async () => {
    const first = await buildForemanRequestManifestContract({
      requestId: "req-1",
      sourceModel: baseSourceModel,
      fileName: "request_REQ_001_req-1.pdf",
    });
    const second = await buildForemanRequestManifestContract({
      requestId: "req-1",
      sourceModel: JSON.parse(JSON.stringify(baseSourceModel)),
      fileName: "request_REQ_001_req-1.pdf",
    });
    const changed = await buildForemanRequestManifestContract({
      requestId: "req-1",
      sourceModel: {
        ...baseSourceModel,
        rows: [{ ...baseSourceModel.rows[0], qtyText: "13" }],
      },
      fileName: "request_REQ_001_req-1.pdf",
    });

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("foreman/request/artifacts/v1/");
    expect(first.artifactPath).toContain(first.artifactVersion);
    expect(first.manifestPath).toContain("foreman/request/manifests/v1/");
  });
});
