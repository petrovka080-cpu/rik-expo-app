import { listCanonicalProposalAttachments } from "./proposalAttachments.service";

type RpcResult = { data: unknown; error: unknown };

type CompatibilityQueryResult = { data: unknown[]; error: unknown };

type CompatibilityQueryChain = {
  eq: jest.Mock<CompatibilityQueryChain, [string, unknown]>;
  order: jest.Mock<CompatibilityQueryChain, [string, { ascending: boolean }]>;
  range: jest.Mock<Promise<CompatibilityQueryResult>, [number, number]>;
};

function createCompatibilityQuery(result: { data: unknown[]; error: unknown }) {
  const chain = {} as CompatibilityQueryChain;
  chain.eq = jest.fn<CompatibilityQueryChain, [string, unknown]>(() => chain);
  chain.order = jest.fn<CompatibilityQueryChain, [string, { ascending: boolean }]>(() => chain);
  chain.range = jest.fn(async (from: number, to: number) => ({
    data: Array.isArray(result.data) ? result.data.slice(from, to + 1) : result.data,
    error: result.error,
  }));
  return {
    select: jest.fn(() => chain),
    chain,
  };
}

function createClient(params: {
  rpcResult: RpcResult;
  compatibilityResult?: { data: unknown[]; error: unknown };
  signedUrl?: string | null;
}) {
  const compatibilityQuery = createCompatibilityQuery(
    params.compatibilityResult ?? { data: [], error: null },
  );
  const createSignedUrl = jest.fn(async () => ({
    data: { signedUrl: params.signedUrl ?? "https://signed.example/file.pdf" },
    error: null,
  }));
  const from = jest.fn(() => compatibilityQuery);
  const rpc = jest.fn(async () => params.rpcResult);

  return {
    rpc,
    from,
    compatibilityQuery,
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

  it("caps signed URL generation for attachment bursts", async () => {
    let active = 0;
    let maxActive = 0;
    const client = createClient({
      rpcResult: {
        data: Array.from({ length: 50 }, (_, index) => ({
          attachment_id: String(index + 1),
          proposal_id: "proposal-burst",
          entity_type: "proposal",
          entity_id: "proposal-burst",
          evidence_kind: "supplier_quote",
          file_name: `quote-${index + 1}.pdf`,
          file_url: null,
          storage_path: `proposals/proposal-burst/quote-${index + 1}.pdf`,
          bucket_id: "proposal_files",
          group_key: "supplier_quote",
          created_at: "2026-03-31T10:00:00Z",
        })),
        error: null,
      },
    });
    const createSignedUrl = client.storage.from().createSignedUrl;
    createSignedUrl.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return {
        data: { signedUrl: `https://signed.example/${path}` },
        error: null,
      };
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-burst", {
      screen: "buyer",
    });

    expect(result.rows).toHaveLength(50);
    expect(maxActive).toBeLessThanOrEqual(5);
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

  it("pages compatibility fallback rows with stable ordering", async () => {
    const compatibilityRows = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      proposal_id: "proposal-paged",
      file_name: `attachment-${index + 1}.pdf`,
      url: `https://legacy.example/${index + 1}.pdf`,
      group_key: "supplier_quote",
      created_at: "2026-03-31T11:00:00Z",
      bucket_id: "proposal_files",
      storage_path: `proposals/proposal-paged/${index + 1}.pdf`,
    }));
    const client = createClient({
      rpcResult: {
        data: null,
        error: { message: "scope failed" },
      },
      compatibilityResult: {
        data: compatibilityRows,
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-paged", {
      screen: "buyer",
    });
    const compatibilityQuery = client.compatibilityQuery.chain;

    expect(result.rows).toHaveLength(101);
    expect(compatibilityQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(compatibilityQuery.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(compatibilityQuery.range).toHaveBeenCalledWith(0, 99);
    expect(compatibilityQuery.range).toHaveBeenCalledWith(100, 199);
  });
});
