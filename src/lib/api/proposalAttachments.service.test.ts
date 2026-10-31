import { listCanonicalProposalAttachments } from "./proposalAttachments.service";

const missingCanonicalRpcError = {
  code: "PGRST202",
  message: "Could not find the function public.proposal_attachment_evidence_scope_v1(p_group_key, p_proposal_id, p_viewer_role) in the schema cache",
};

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
  signedUrlError?: unknown;
}) {
  const compatibilityQuery = createCompatibilityQuery(
    params.compatibilityResult ?? { data: [], error: null },
  );
  const createSignedUrl = jest.fn(async () => ({
    data: { signedUrl: params.signedUrl ?? "https://signed.example/file.pdf" },
    error: params.signedUrlError ?? null,
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

  it("falls back to compatibility rows only when the canonical RPC version is missing", async () => {
    const client = createClient({
      rpcResult: {
        data: null,
        error: missingCanonicalRpcError,
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
    expect(result.errorMessage).toBe(missingCanonicalRpcError.message);
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
        error: missingCanonicalRpcError,
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

  it.each([
    ["database permission", { code: "42501", message: "permission denied" }],
    ["expired JWT", { code: "PGRST301", message: "JWT expired", status: 401 }],
    ["HTTP unauthorized", { status: 401, message: "Unauthorized" }],
    ["HTTP forbidden", { status: 403, message: "Forbidden" }],
    ["MFA assurance", { code: "insufficient_aal", message: "MFA required" }],
    ["unknown scope failure", { message: "scope failed" }],
    ["transport failure", new Error("Network request failed")],
    ["statement timeout", { code: "57014", message: "canceling statement due to statement timeout" }],
    ["wrong missing RPC", { ...missingCanonicalRpcError, message: "Could not find the function public.other_scope_v1() in the schema cache" }],
    ["wrong overload", { ...missingCanonicalRpcError, message: "Could not find the function public.proposal_attachment_evidence_scope_v1(p_proposal_id) in the schema cache" }],
    ["extra overload parameter", { ...missingCanonicalRpcError, message: "Could not find the function public.proposal_attachment_evidence_scope_v1(p_proposal_id, p_group_key, p_viewer_role, p_actor) in the schema cache" }],
    ["duplicate overload parameter", { ...missingCanonicalRpcError, message: "Could not find the function public.proposal_attachment_evidence_scope_v1(p_proposal_id, p_proposal_id, p_viewer_role) in the schema cache" }],
    ["misclassified denied response", { ...missingCanonicalRpcError, statusCode: 403 }],
    ["contradictory server failure", { ...missingCanonicalRpcError, status: 500 }],
    ["missing code without exact function", { code: "PGRST202", message: "schema cache failed" }],
  ])("does not widen %s to compatibility reads or signing", async (_label, error) => {
    const client = createClient({
      rpcResult: { data: null, error },
      compatibilityResult: {
        data: [{ id: 91, proposal_id: "proposal-denied", file_name: "hidden.pdf", url: "https://legacy.example/hidden.pdf" }],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-denied", {
      screen: "accountant",
      fallbackOnEmpty: true,
    });

    expect(result).toEqual(expect.objectContaining({
      rows: [], state: "error", sourceKind: "rpc:proposal_attachment_evidence_scope_v1",
      fallbackUsed: false, errorMessage: expect.any(String),
    }));
    expect(client.from).not.toHaveBeenCalled();
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("keeps successful canonical empty authoritative even for a legacy fallbackOnEmpty caller", async () => {
    const client = createClient({
      rpcResult: { data: [], error: null },
      compatibilityResult: {
        data: [{ id: 92, proposal_id: "proposal-empty", file_name: "hidden.pdf", url: "https://legacy.example/hidden.pdf" }],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-empty", { fallbackOnEmpty: true });

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "empty", fallbackUsed: false, errorMessage: null }));
    expect(client.from).not.toHaveBeenCalled();
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("accepts only the same named RPC arguments regardless of error-message ordering", async () => {
    const client = createClient({
      rpcResult: {
        data: null,
        error: { ...missingCanonicalRpcError, status: 404, message: "Could not find the function public.proposal_attachment_evidence_scope_v1(p_proposal_id,p_group_key,p_viewer_role) in the schema cache" },
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-missing-ordered");

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "degraded", fallbackUsed: true }));
    expect(client.from).toHaveBeenCalledWith("proposal_attachments");
  });

  it("does not replace a canonical group-filtered empty with compatibility rows", async () => {
    const client = createClient({
      rpcResult: {
        data: [{ attachment_id: "93", proposal_id: "proposal-filtered", group_key: "supplier_quote", file_name: "quote.pdf", file_url: "https://canonical.example/quote.pdf" }],
        error: null,
      },
      compatibilityResult: {
        data: [{ id: 94, proposal_id: "proposal-filtered", group_key: "invoice", file_name: "hidden.pdf", url: "https://legacy.example/hidden.pdf" }],
        error: null,
      },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-filtered", { groupKey: "invoice", fallbackOnEmpty: true });

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "empty", fallbackUsed: false, rawCount: 1, mappedCount: 1, filteredCount: 1 }));
    expect(client.from).not.toHaveBeenCalled();
  });

  it("does not treat signing failure as an absent canonical RPC even with the same missing-version error", async () => {
    const client = createClient({
      rpcResult: {
        data: [{ attachment_id: "95", proposal_id: "proposal-signing", file_name: "invoice.pdf", storage_path: "proposal-signing/invoice.pdf", bucket_id: "proposal_files" }],
        error: null,
      },
      signedUrlError: missingCanonicalRpcError,
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-signing");

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "error", fallbackUsed: false, rawCount: 1, errorMessage: missingCanonicalRpcError.message }));
    expect(client.storage.from().createSignedUrl).toHaveBeenCalledTimes(1);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects malformed canonical payload without compatibility fallback", async () => {
    const client = createClient({ rpcResult: { data: { rows: [] }, error: null } });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-malformed");

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "error", fallbackUsed: false }));
    expect(client.from).not.toHaveBeenCalled();
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("keeps an exact missing-version compatibility failure as an error", async () => {
    const client = createClient({
      rpcResult: { data: null, error: missingCanonicalRpcError },
      compatibilityResult: { data: [], error: { code: "42501", message: "compatibility denied" } },
    });

    const result = await listCanonicalProposalAttachments(client as never, "proposal-compatibility-denied");

    expect(result).toEqual(expect.objectContaining({ rows: [], state: "error", fallbackUsed: true }));
    expect(client.from).toHaveBeenCalledWith("proposal_attachments");
    expect(client.storage.from).not.toHaveBeenCalled();
  });
});
