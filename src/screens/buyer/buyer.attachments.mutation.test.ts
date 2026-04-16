import {
  attachFileToProposalAction,
  ensureProposalHtmlAttachmentMutation,
  uploadSupplierProposalAttachmentsMutation,
} from "./buyer.attachments.mutation";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import { getLatestCanonicalProposalAttachment } from "../../lib/api/proposalAttachments.service";

jest.mock("../../lib/api/proposalAttachments.service", () => ({
  getLatestCanonicalProposalAttachment: jest.fn(),
}));

const mockedGetLatestCanonicalProposalAttachment =
  getLatestCanonicalProposalAttachment as jest.MockedFunction<typeof getLatestCanonicalProposalAttachment>;

describe("buyer attachments mutation owner", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    mockedGetLatestCanonicalProposalAttachment.mockReset();
  });

  it("keeps attach-file happy path inside the attachments owner", async () => {
    const alert = jest.fn();
    const uploadProposalAttachment = jest.fn(async () => undefined);
    const loadProposalAttachments = jest.fn(async () => undefined);
    const setBusy = jest.fn();

    const result = await attachFileToProposalAction({
      proposalId: "proposal-1",
      groupKey: "supplier_quote",
      pickFileAny: async () => ({ name: "quote.pdf", uri: "file:///quote.pdf" }),
      uploadProposalAttachment,
      loadProposalAttachments,
      setBusy,
      alert,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.completedStages).toEqual([
      "pick_file",
      "upload_attachment",
      "reload_attachments",
    ]);
    expect(uploadProposalAttachment).toHaveBeenCalledWith(
      "proposal-1",
      expect.objectContaining({ name: "quote.pdf" }),
      "quote.pdf",
      "supplier_quote",
    );
    expect(loadProposalAttachments).toHaveBeenCalledWith("proposal-1");
    expect(alert).not.toHaveBeenCalled();
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("surfaces the exact attachment stage when reload fails", async () => {
    const alert = jest.fn();

    const result = await attachFileToProposalAction({
      proposalId: "proposal-1",
      groupKey: "supplier_quote",
      pickFileAny: async () => ({ name: "quote.pdf", uri: "file:///quote.pdf" }),
      uploadProposalAttachment: async () => undefined,
      loadProposalAttachments: async () => {
        throw new Error("reload failed");
      },
      setBusy: jest.fn(),
      alert,
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("reload_attachments");
    expect(alert).toHaveBeenCalledWith(
      "Ошибка",
      expect.stringContaining("Обновление списка вложений"),
    );
  });

  it("does not hide partial supplier attachment upload success", async () => {
    const uploadProposalAttachment = jest
      .fn<Promise<void>, [string, unknown, string, string]>()
      .mockRejectedValueOnce(new Error("upload failed"))
      .mockResolvedValueOnce(undefined);

    const result = await uploadSupplierProposalAttachmentsMutation({
      createdProposals: [
        { proposal_id: "proposal-1", supplier: "Acme" },
        { proposal_id: "proposal-2", supplier: "Acme" },
      ],
      attachmentsNow: {
        Acme: {
          file: { name: "quote.pdf", uri: "file:///quote.pdf" },
          name: "quote.pdf",
        },
      },
      uploadProposalAttachment: uploadProposalAttachment as never,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("partial_success");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        stage: "upload_supplier_attachments",
        degraded: true,
      }),
    ]);
    expect(result.data).toEqual({ uploadCount: 2, failedCount: 1 });
  });

  it("matches supplier attachments by normalized supplier key", async () => {
    const uploadProposalAttachment = jest.fn(async () => undefined);

    const result = await uploadSupplierProposalAttachmentsMutation({
      createdProposals: [
        { proposal_id: "proposal-1", supplier: "Acme, Ltd." },
      ],
      attachmentsNow: {
        "acme ltd": {
          file: { name: "quote.pdf", uri: "file:///quote.pdf" },
          name: "quote.pdf",
        },
      },
      uploadProposalAttachment,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ uploadCount: 1, failedCount: 0 });
    expect(uploadProposalAttachment).toHaveBeenCalledWith(
      "proposal-1",
      expect.objectContaining({ name: "quote.pdf" }),
      "quote.pdf",
      "supplier_quote",
    );
  });

  it("uses canonical attachment lookup before generating proposal_html", async () => {
    const uploadProposalAttachment = jest.fn(async () => undefined);

    mockedGetLatestCanonicalProposalAttachment.mockResolvedValue({
      row: {} as never,
      result: {} as never,
    });

    const result = await ensureProposalHtmlAttachmentMutation({
      proposalId: "proposal-1",
      supabase: { rpc: jest.fn() } as never,
      buildProposalPdfHtml: jest.fn(async () => "<html />"),
      uploadProposalAttachment,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("existing");
    expect(mockedGetLatestCanonicalProposalAttachment).toHaveBeenCalledWith(
      expect.anything(),
      "proposal-1",
      "proposal_pdf",
      expect.objectContaining({ screen: "buyer" }),
    );
    expect(uploadProposalAttachment).not.toHaveBeenCalled();
  });

  it("uploads proposal_html only when canonical proposal_pdf is missing", async () => {
    const uploadProposalAttachment = jest.fn(async () => undefined);

    mockedGetLatestCanonicalProposalAttachment.mockRejectedValue(new Error("Attachment not found"));

    const result = await ensureProposalHtmlAttachmentMutation({
      proposalId: "proposal-2",
      supabase: { rpc: jest.fn() } as never,
      buildProposalPdfHtml: jest.fn(async () => "<html><body>ok</body></html>"),
      uploadProposalAttachment,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("uploaded");
    expect(uploadProposalAttachment).toHaveBeenCalledWith(
      "proposal-2",
      expect.any(Blob),
      "proposal_proposal.html",
      "proposal_html",
    );
  });
});
