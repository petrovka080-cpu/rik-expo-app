import { Platform } from "react-native";

type UploadProposalFileParams = {
  storagePath: string;
  uploadBody: unknown;
  contentType: string;
};

type AttachmentEvidenceParams = {
  proposalId: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  groupKey: string;
  mimeType?: string | null;
};

const mockUploadProposalFileObject = jest.fn<
  Promise<{ error: Error | null }>,
  [UploadProposalFileParams]
>();
const mockRemoveProposalFileObject = jest.fn<Promise<void>, [string, string]>();
const mockAttachProposalAttachmentEvidenceWithDefaultClient = jest.fn<
  Promise<void>,
  [AttachmentEvidenceParams]
>();

jest.mock("./storage.transport", () => ({
  PROPOSAL_FILES_BUCKET: "proposal_files",
  uploadProposalFileObject: (...args: Parameters<typeof mockUploadProposalFileObject>) =>
    mockUploadProposalFileObject(...args),
  removeProposalFileObject: (...args: Parameters<typeof mockRemoveProposalFileObject>) =>
    mockRemoveProposalFileObject(...args),
  attachProposalAttachmentEvidenceWithDefaultClient: (
    ...args: Parameters<typeof mockAttachProposalAttachmentEvidenceWithDefaultClient>
  ) => mockAttachProposalAttachmentEvidenceWithDefaultClient(...args),
}));

const createWebFile = (params: {
  name: string;
  type: string;
  content?: string;
}): Blob & { name: string } => {
  const file = new Blob([params.content ?? "file-body"], { type: params.type });
  Object.defineProperty(file, "name", {
    configurable: true,
    value: params.name,
  });
  return file as Blob & { name: string };
};

const loadSubject = () => require("./storage") as typeof import("./storage");

describe("storage attachment service transport boundary", () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    mockUploadProposalFileObject.mockReset();
    mockRemoveProposalFileObject.mockReset();
    mockAttachProposalAttachmentEvidenceWithDefaultClient.mockReset();
    mockUploadProposalFileObject.mockResolvedValue({ error: null });
    mockRemoveProposalFileObject.mockResolvedValue();
    mockAttachProposalAttachmentEvidenceWithDefaultClient.mockResolvedValue();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
  });

  it("uploads web proposal attachments through the storage transport and binds evidence", async () => {
    const { uploadProposalAttachment } = loadSubject();
    const file = createWebFile({
      name: "quote.pdf",
      type: "application/pdf",
    });

    await uploadProposalAttachment("proposal-1", file, "fallback.pdf", "invoice");

    expect(mockUploadProposalFileObject).toHaveBeenCalledTimes(1);
    const uploadCall = mockUploadProposalFileObject.mock.calls[0]?.[0];
    expect(uploadCall).toEqual(
      expect.objectContaining({
        uploadBody: file,
        contentType: "application/pdf",
      }),
    );
    expect(uploadCall?.storagePath).toMatch(
      /^proposals\/proposal-1\/invoice\/[0-9]+-quote\.pdf$/,
    );
    expect(mockAttachProposalAttachmentEvidenceWithDefaultClient).toHaveBeenCalledWith({
      proposalId: "proposal-1",
      bucketId: "proposal_files",
      storagePath: uploadCall?.storagePath,
      fileName: "quote.pdf",
      groupKey: "invoice",
      mimeType: "application/pdf",
    });
    expect(mockRemoveProposalFileObject).not.toHaveBeenCalled();
  });

  it("keeps uploaded-object cleanup when evidence binding fails", async () => {
    const { uploadProposalAttachment } = loadSubject();
    const file = createWebFile({
      name: "payment.pdf",
      type: "application/pdf",
    });
    mockAttachProposalAttachmentEvidenceWithDefaultClient.mockRejectedValueOnce(
      new Error("evidence attach failed"),
    );

    await expect(
      uploadProposalAttachment("proposal-2", file, "fallback.pdf", "payment"),
    ).rejects.toThrow("evidence attach failed");

    const uploadCall = mockUploadProposalFileObject.mock.calls[0]?.[0];
    expect(mockRemoveProposalFileObject).toHaveBeenCalledWith(
      "proposal_files",
      uploadCall?.storagePath,
    );
  });

  it("stages queued attachments through the same storage transport without binding evidence", async () => {
    const { stageProposalAttachmentForQueue } = loadSubject();
    const file = createWebFile({
      name: "queue.pdf",
      type: "application/pdf",
    });

    const result = await stageProposalAttachmentForQueue(
      file,
      "fallback.pdf",
      "supplier-key",
      "proposal_pdf",
    );

    expect(mockUploadProposalFileObject).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        supplierKey: "supplier-key",
        fileName: "queue.pdf",
        bucketId: "proposal_files",
        groupKey: "proposal_pdf",
        mimeType: "application/pdf",
      }),
    );
    expect(result.storagePath).toMatch(
      /^queued\/proposal_pdf\/supplier-key\/[0-9]+-queue\.pdf$/,
    );
    expect(mockAttachProposalAttachmentEvidenceWithDefaultClient).not.toHaveBeenCalled();
  });
});
