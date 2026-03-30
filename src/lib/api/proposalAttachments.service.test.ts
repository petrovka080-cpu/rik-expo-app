import { listCanonicalProposalAttachments } from "./proposalAttachments.service";

type RpcResult = { data: unknown; error: unknown };

function createCompatibilityQuery(result: { data: unknown[]; error: unknown }) {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(async () => result),
      })),
    })),
  };
}

function createClient(params: {
  rpcResult: RpcResult;
  compatibilityResult?: { data: unknown[]; error: unknown };
  signedUrl?: string | null;
}) {
  const createSignedUrl = jest.fn(async () => ({
    data: { signedUrl: params.signedUrl ?? "https://signed.example/file.pdf" },
    error: null,
  }));
  const from = jest.fn(() =>
    createCompatibilityQuery(params.compatibilityResult ?? { data: [], error: null }),
  );
  const rpc = jest.fn(async () => params.rpcResult);

  return {
    rpc,
    from,
    storage: {
      from: jest.fn(() => ({
        createSignedUrl,
      })),
    },
  };
}

describe("proposalAttachments.service evidence boundary", () => {
  it("maps canonical evidence metadata from the server-owned scope rpc", async () => {
    const client = createClient({
      rpcResult: {
        data: [
          {
            attachment_id: "17",
            proposal_id: "proposal-1",
            entity_type: "proposal",
            entity_id: "proposal-1",
            evidence_kind: "supplier_quote",
            created_by: "buyer-1",
            visibility_scope: "buyer_director_accountant",
            file_name: "quote.pdf",
            mime_type: "application/pdf",
            file_url: null,
            storage_path: "proposals/proposal-1/supplier_quote/quote.pdf",
            bucket_id: "proposal_files",
            group_key: "supplier_quote",
            created_at: "2026-03-31T10:00:00Z",
          },
        ],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-1", {
      screen: "accountant",
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "proposal_attachment_evidence_scope_v1",
      expect.objectContaining({
        p_proposal_id: "proposal-1",
        p_viewer_role: "accountant",
      }),
    );
    expect(result.state).toBe("ready");
    expect(result.fallbackUsed).toBe(false);
    expect(result.rows).toEqual([
      expect.objectContaining({
        attachmentId: "17",
        proposalId: "proposal-1",
        entityType: "proposal",
        entityId: "proposal-1",
        evidenceKind: "supplier_quote",
        createdBy: "buyer-1",
        visibilityScope: "buyer_director_accountant",
        ownerType: "proposal",
        fileUrl: "https://signed.example/file.pdf",
      }),
    ]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("treats canonical empty as empty and does not hit compatibility fallback by default", async () => {
    const client = createClient({
      rpcResult: {
        data: [],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-2", {
      screen: "buyer",
    });

    expect(result.state).toBe("empty");
    expect(result.fallbackUsed).toBe(false);
    expect(result.rows).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("falls back to compatibility rows only when canonical scope fails", async () => {
    const client = createClient({
      rpcResult: {
        data: null,
        error: { message: "scope failed" },
      },
      compatibilityResult: {
        data: [
          {
            id: 42,
            proposal_id: "proposal-3",
            file_name: "invoice.pdf",
            url: "https://legacy.example/invoice.pdf",
            group_key: "invoice",
            created_at: "2026-03-31T11:00:00Z",
            bucket_id: "proposal_files",
            storage_path: "proposals/proposal-3/invoice/invoice.pdf",
          },
        ],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-3", {
      screen: "director",
    });

    expect(result.state).toBe("degraded");
    expect(result.fallbackUsed).toBe(true);
    expect(result.sourceKind).toBe("table:proposal_attachments");
    expect(result.errorMessage).toContain("scope failed");
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        attachmentId: "42",
        proposalId: "proposal-3",
        evidenceKind: "invoice",
        ownerType: "invoice",
        sourceKind: "compatibility",
        fileUrl: "https://legacy.example/invoice.pdf",
      }),
    );
  });
});
