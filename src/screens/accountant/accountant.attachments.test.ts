import { listCanonicalProposalAttachments } from "../../lib/api/proposalAttachments.service";
import { listProposalAttachments } from "./accountant.attachments";

jest.mock("../../lib/api/proposalAttachments.service", () => {
  const actual = jest.requireActual("../../lib/api/proposalAttachments.service");
  return {
    ...actual,
    listCanonicalProposalAttachments: jest.fn(),
  };
});

const mockedListCanonicalProposalAttachments =
  listCanonicalProposalAttachments as jest.MockedFunction<typeof listCanonicalProposalAttachments>;

function createAccountantClient() {
  return {
    from: jest.fn((table: string) => {
      if (table === "proposals") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(async () => ({
              data: null,
              error: null,
            })),
          })),
        };
      }
      if (table === "proposal_payments") {
        return {
          select: jest.fn(async () => ({
            count: 0,
            error: null,
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("accountant.attachments evidence boundary", () => {
  beforeEach(() => {
    mockedListCanonicalProposalAttachments.mockReset();
  });

  it("keeps supplier commercial evidence and drops technical buyer-only rows", async () => {
    mockedListCanonicalProposalAttachments.mockResolvedValue({
      rows: [
        {
          attachmentId: "1",
          proposalId: "proposal-1",
          ownerType: "proposal",
          ownerId: "proposal-1",
          entityType: "proposal",
          entityId: "proposal-1",
          evidenceKind: "supplier_quote",
          createdBy: "buyer-1",
          visibilityScope: "buyer_director_accountant",
          fileName: "quote.pdf",
          mimeType: "application/pdf",
          fileUrl: "https://example.com/quote.pdf",
          storagePath: "proposals/proposal-1/supplier_quote/quote.pdf",
          bucketId: "proposal_files",
          groupKey: "supplier_quote",
          createdAt: "2026-03-31T10:00:00Z",
          sourceKind: "canonical",
        },
        {
          attachmentId: "2",
          proposalId: "proposal-1",
          ownerType: "proposal",
          ownerId: "proposal-1",
          entityType: "proposal",
          entityId: "proposal-1",
          evidenceKind: "proposal_html",
          createdBy: "buyer-1",
          visibilityScope: "buyer_only",
          fileName: "proposal.html",
          mimeType: "text/html",
          fileUrl: "https://example.com/proposal.html",
          storagePath: "proposals/proposal-1/proposal_html/proposal.html",
          bucketId: "proposal_files",
          groupKey: "proposal_html",
          createdAt: "2026-03-31T09:00:00Z",
          sourceKind: "canonical",
        },
      ],
      state: "ready",
      sourceKind: "rpc:proposal_attachment_evidence_scope_v1",
      fallbackUsed: false,
      rawCount: 2,
      mappedCount: 2,
      filteredCount: 0,
      errorMessage: null,
    });

    const result = await listProposalAttachments(createAccountantClient() as never, "proposal-1");

    expect(result.state).toBe("ready");
    expect(result.rows).toEqual([
      expect.objectContaining({
        attachmentId: "1",
        ownerType: "proposal_commercial",
        ownerId: "proposal-1",
        basisKind: "supplier_quote",
      }),
    ]);
    expect(result.diagnostics.filterReasons.surrogate_group).toBe(1);
  });

  it("preserves current semantics by excluding invoice attachments from accountant basis list", async () => {
    mockedListCanonicalProposalAttachments.mockResolvedValue({
      rows: [
        {
          attachmentId: "3",
          proposalId: "proposal-2",
          ownerType: "invoice",
          ownerId: "proposal-2",
          entityType: "proposal",
          entityId: "proposal-2",
          evidenceKind: "invoice",
          createdBy: "buyer-1",
          visibilityScope: "buyer_director_accountant",
          fileName: "invoice.pdf",
          mimeType: "application/pdf",
          fileUrl: "https://example.com/invoice.pdf",
          storagePath: "proposals/proposal-2/invoice/invoice.pdf",
          bucketId: "proposal_files",
          groupKey: "invoice",
          createdAt: "2026-03-31T10:30:00Z",
          sourceKind: "canonical",
        },
      ],
      state: "ready",
      sourceKind: "rpc:proposal_attachment_evidence_scope_v1",
      fallbackUsed: false,
      rawCount: 1,
      mappedCount: 1,
      filteredCount: 0,
      errorMessage: null,
    });

    const result = await listProposalAttachments(createAccountantClient() as never, "proposal-2");

    expect(result.state).toBe("degraded");
    expect(result.rows).toEqual([]);
    expect(result.diagnostics.filterReasons.non_basis_group).toBe(1);
  });
});
