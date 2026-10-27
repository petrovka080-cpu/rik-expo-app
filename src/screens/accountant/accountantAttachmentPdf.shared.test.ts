import {
  buildAccountantAttachmentPdfManifestContract,
  buildAccountantAttachmentPdfSourceModel,
} from "./accountantAttachmentPdf.shared";

const baseSource = {
  proposalId: "proposal-1",
  groupKey: "invoice",
  attachmentId: "att-1",
  fileName: "invoice.pdf",
  url: "https://storage.example.test/invoice.pdf?token=one",
  bucketId: "proposal-attachments",
  storagePath: "proposal-1/invoice.pdf",
  createdAt: "2026-04-20T10:00:00.000Z",
};

describe("accountant attachment PDF manifest contract (PDF-ACC-FINAL)", () => {
  it("keeps the same versions for the same attachment source", () => {
    const first = buildAccountantAttachmentPdfManifestContract(baseSource);
    const second = buildAccountantAttachmentPdfManifestContract({ ...baseSource });

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("accountant/attachment/artifacts/v1/");
    expect(first.manifestPath).toContain("accountant/attachment/manifests/v1/");
    expect(first.status).toBe("ready");
  });

  it("ignores signed URL query churn", () => {
    const first = buildAccountantAttachmentPdfManifestContract(baseSource);
    const noisy = buildAccountantAttachmentPdfManifestContract({
      ...baseSource,
      url: "https://storage.example.test/invoice.pdf?token=two",
    });

    expect(buildAccountantAttachmentPdfSourceModel(noisyLike(baseSource)).urlBase)
      .toBe("https://storage.example.test/invoice.pdf");
    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });

  it("changes versions when latest attachment identity changes", () => {
    const first = buildAccountantAttachmentPdfManifestContract(baseSource);
    const changed = buildAccountantAttachmentPdfManifestContract({
      ...baseSource,
      attachmentId: "att-2",
      storagePath: "proposal-1/invoice-v2.pdf",
      createdAt: "2026-04-20T11:00:00.000Z",
    });

    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
  });
});

function noisyLike(source: typeof baseSource) {
  return {
    ...source,
    url: "https://storage.example.test/invoice.pdf?noise=1",
  };
}
