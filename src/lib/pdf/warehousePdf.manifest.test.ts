import {
  buildWarehouseIncomingRegisterClientSourceFingerprint,
  buildWarehouseIncomingRegisterManifestContract,
} from "./warehousePdf.shared";

const baseRows = [
  {
    incoming_id: "in-1",
    display_no: "IN-001",
    event_dt: "2026-04-20T08:00:00.000Z",
    who: "Warehouse User",
    qty_total: 12,
  },
  {
    incoming_id: "in-2",
    display_no: "IN-002",
    event_dt: "2026-04-20T09:00:00.000Z",
    who: "Warehouse User",
    qty_total: 3,
  },
];

describe("warehouse incoming register manifest contract (PDF-Z3)", () => {
  it("keeps same business data on the same client source fingerprint", () => {
    const first = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: baseRows,
    });
    const second = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: JSON.parse(JSON.stringify(baseRows)),
    });

    expect(second).toBe(first);
  });

  it("changes the client source fingerprint when meaningful incoming data changes", () => {
    const first = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: baseRows,
    });
    const changed = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: [
        ...baseRows.slice(0, 1),
        {
          ...baseRows[1],
          qty_total: 4,
        },
      ],
    });

    expect(changed).not.toBe(first);
  });

  it("ignores transport and timing noise in the client source fingerprint", () => {
    const first = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: baseRows,
    });
    const noisy = buildWarehouseIncomingRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      incomingRows: baseRows.map((row, index) => ({
        ...row,
        generated_at: `2026-04-20T10:00:0${index}.000Z`,
        durationMs: 100 + index,
        traceId: `trace-${index}`,
        signedUrl: `https://example.com/${index}.pdf`,
      })),
    });

    expect(noisy).toBe(first);
  });

  it("builds stable source and artifact versions for server-side artifact reuse", async () => {
    const first = await buildWarehouseIncomingRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "Склад",
      incomingHeads: baseRows,
      fileName: "warehouse_register_incoming_register_all.pdf",
    });
    const second = await buildWarehouseIncomingRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "Склад",
      incomingHeads: JSON.parse(JSON.stringify(baseRows)),
      fileName: "warehouse_register_incoming_register_all.pdf",
    });
    const changed = await buildWarehouseIncomingRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "Склад",
      incomingHeads: [{ ...baseRows[0], qty_total: 99 }],
      fileName: "warehouse_register_incoming_register_all.pdf",
    });

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("warehouse/incoming_register/artifacts/v1/");
    expect(first.artifactPath).toContain(first.artifactVersion);
    expect(first.fileName).toBe("warehouse_register_incoming_register_all.pdf");
  });
});
