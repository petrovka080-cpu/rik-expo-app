import {
  buildWarehouseIssueRegisterClientSourceFingerprint,
  buildWarehouseIssueRegisterManifestContract,
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

const issueRows = [
  {
    issue_id: "77",
    issue_no: "ISS-077",
    event_dt: "2026-04-20T08:00:00.000Z",
    who: "Warehouse User",
    qty_total: 12,
    object_name: "Object A",
    work_name: "Work A",
  },
  {
    issue_id: "78",
    issue_no: "ISS-078",
    event_dt: "2026-04-20T09:00:00.000Z",
    who: "Warehouse User",
    qty_total: 3,
    object_name: "Object B",
    work_name: "Work B",
  },
];

describe("warehouse issue register manifest contract (PDF-FINAL)", () => {
  it("keeps same business data on the same client source fingerprint", () => {
    const first = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows,
    });
    const second = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows: JSON.parse(JSON.stringify(issueRows)),
    });

    expect(second).toBe(first);
  });

  it("changes the client source fingerprint when meaningful issue data changes", () => {
    const first = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows,
    });
    const changed = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows: [
        ...issueRows.slice(0, 1),
        {
          ...issueRows[1],
          qty_total: 4,
        },
      ],
    });

    expect(changed).not.toBe(first);
  });

  it("ignores transport and timing noise in the client source fingerprint", () => {
    const first = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows,
    });
    const noisy = buildWarehouseIssueRegisterClientSourceFingerprint({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      issueRows: issueRows.map((row, index) => ({
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
    const first = await buildWarehouseIssueRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "РЎРєР»Р°Рґ",
      issueHeads: issueRows,
      fileName: "warehouse_register_issue_register_all.pdf",
    });
    const second = await buildWarehouseIssueRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "РЎРєР»Р°Рґ",
      issueHeads: JSON.parse(JSON.stringify(issueRows)),
      fileName: "warehouse_register_issue_register_all.pdf",
    });
    const changed = await buildWarehouseIssueRegisterManifestContract({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      companyName: "GOX",
      warehouseName: "РЎРєР»Р°Рґ",
      issueHeads: [{ ...issueRows[0], qty_total: 99 }],
      fileName: "warehouse_register_issue_register_all.pdf",
    });

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("warehouse/issue_register/artifacts/v1/");
    expect(first.artifactPath).toContain(first.artifactVersion);
    expect(first.fileName).toBe("warehouse_register_issue_register_all.pdf");
  });
});
