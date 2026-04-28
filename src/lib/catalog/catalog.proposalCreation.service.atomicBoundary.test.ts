import fs from "fs";
import path from "path";

import { supabase } from "../supabaseClient";
import { RpcValidationError } from "../api/queryBoundary";
import { createProposalsBySupplier } from "./catalog.proposalCreation.service";

jest.mock("../supabaseClient", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const mockedSupabase = supabase as unknown as {
  rpc: jest.Mock;
  from: jest.Mock;
};

const serviceSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/catalog/catalog.proposalCreation.service.ts"),
  "utf8",
);

describe("catalog proposal atomic boundary", () => {
  beforeEach(() => {
    mockedSupabase.rpc.mockReset();
    mockedSupabase.from.mockReset().mockImplementation(() => {
      throw new Error("legacy direct write path should not be used by primary proposal boundary");
    });
  });

  it("uses only rpc_proposal_submit_v3 for the primary create+submit path", async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: {
        status: "ok",
        proposals: [
          {
            bucket_index: 0,
            proposal_id: "proposal-1",
            proposal_no: "PR-1",
            supplier: "Acme",
            request_item_ids: ["ri-1"],
            raw_status: "submitted",
            submitted_at: "2026-03-30T10:00:00.000Z",
            sent_to_accountant_at: null,
            submit_source: "rpc:proposal_submit_text_v1",
          },
        ],
        meta: {
          canonical_path: "rpc:proposal_submit_v3",
          client_mutation_id: "mutation-1",
          request_id: "request-1",
          idempotent_replay: false,
          expected_bucket_count: 1,
          expected_item_count: 1,
          created_proposal_count: 1,
          created_item_count: 1,
          attachment_continuation_ready: true,
        },
      },
      error: null,
    });

    const result = await createProposalsBySupplier(
      [
        {
          supplier: "Acme",
          request_item_ids: ["ri-1"],
          meta: [{ request_item_id: "ri-1", price: "100", supplier: "Acme", note: "n1" }],
        },
      ],
      {
        buyerFio: "Buyer User",
        requestId: "request-1",
        clientMutationId: "mutation-1",
      },
    );

    expect(mockedSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      "rpc_proposal_submit_v3",
      expect.objectContaining({
        p_client_mutation_id: "mutation-1",
        p_request_id: "request-1",
        p_submit: true,
      }),
    );
    expect(mockedSupabase.from).not.toHaveBeenCalled();
    expect(result).toEqual({
      proposals: [
        {
          proposal_id: "proposal-1",
          proposal_no: "PR-1",
          supplier: "Acme",
          request_item_ids: ["ri-1"],
          status: "submitted",
          raw_status: "submitted",
          submitted: true,
          submitted_at: "2026-03-30T10:00:00.000Z",
          visible_to_director: true,
          submit_source: "rpc:proposal_submit_text_v1",
        },
      ],
      meta: {
        canonical_path: "rpc:proposal_submit_v3",
        client_mutation_id: "mutation-1",
        request_id: "request-1",
        idempotent_replay: false,
        expected_bucket_count: 1,
        expected_item_count: 1,
        created_proposal_count: 1,
        created_item_count: 1,
        attachment_continuation_ready: true,
      },
    });
  });

  it("does not fall back to client-side proposal writes when the atomic rpc rejects", async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "proposal_submit_v3_partial_insert_detected",
      },
    });

    await expect(
      createProposalsBySupplier(
        [
          {
            supplier: "Acme",
            request_item_ids: ["ri-1"],
            meta: [{ request_item_id: "ri-1", price: "100", supplier: "Acme", note: "n1" }],
          },
        ],
        {
          buyerFio: "Buyer User",
          requestId: "request-1",
          clientMutationId: "mutation-rollback-1",
        },
      ),
    ).rejects.toMatchObject({
      code: "P0001",
      message: "proposal_submit_v3_partial_insert_detected",
    });

    expect(mockedSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("keeps legacy client write orchestration out of the proposal creation service", () => {
    expect(serviceSource).toContain("rpc_proposal_submit_v3");
    expect(serviceSource).toContain("runAtomicProposalSubmitRpc");
    expect(serviceSource).not.toContain("createProposalHeadStage");
    expect(serviceSource).not.toContain("linkProposalItemsStage");
    expect(serviceSource).not.toContain("completeProposalCreationStage");
    expect(serviceSource).not.toContain("syncProposalRequestItemStatusStage");
    expect(serviceSource).not.toContain("proposalCreateFull");
    expect(serviceSource).not.toContain("proposalAddItems");
    expect(serviceSource).not.toContain("proposalSnapshotItems");
    expect(serviceSource).not.toContain("request_items_set_status");
    expect(serviceSource).not.toContain("mutation:proposal_items_fallback");
    expect(serviceSource).not.toContain("@typescript-eslint/no-unused-vars");
  });

  it("rejects inconsistent atomic rpc success payloads instead of accepting partial commits", async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: {
        status: "ok",
        proposals: [
          {
            bucket_index: 0,
            proposal_id: "proposal-1",
            proposal_no: "PR-1",
            supplier: "Acme",
            request_item_ids: ["ri-1"],
            raw_status: "submitted",
            submitted_at: "2026-03-30T10:00:00.000Z",
            sent_to_accountant_at: null,
            submit_source: "rpc:proposal_submit_text_v1",
          },
        ],
        meta: {
          canonical_path: "rpc:proposal_submit_v3",
          client_mutation_id: "mutation-partial-1",
          request_id: "request-1",
          idempotent_replay: false,
          expected_bucket_count: 1,
          expected_item_count: 2,
          created_proposal_count: 1,
          created_item_count: 1,
          attachment_continuation_ready: true,
        },
      },
      error: null,
    });

    await expect(
      createProposalsBySupplier(
        [
          {
            supplier: "Acme",
            request_item_ids: ["ri-1", "ri-2"],
            meta: [
              { request_item_id: "ri-1", price: "100", supplier: "Acme", note: "n1" },
              { request_item_id: "ri-2", price: "200", supplier: "Acme", note: "n2" },
            ],
          },
        ],
        {
          buyerFio: "Buyer User",
          requestId: "request-1",
          clientMutationId: "mutation-partial-1",
        },
      ),
    ).rejects.toThrow("rpc_proposal_submit_v3 item count mismatch: expected 2, got 1");

    expect(mockedSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("throws RpcValidationError for malformed atomic proposal response shape", async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: {
        status: "ok",
        proposals: [{ proposal_no: "PR-1" }],
      },
      error: null,
    });

    await expect(
      createProposalsBySupplier(
        [
          {
            supplier: "Acme",
            request_item_ids: ["ri-1"],
            meta: [{ request_item_id: "ri-1", price: "100", supplier: "Acme", note: "n1" }],
          },
        ],
        {
          buyerFio: "Buyer User",
          requestId: "request-1",
          clientMutationId: "mutation-malformed-1",
        },
      ),
    ).rejects.toBeInstanceOf(RpcValidationError);

    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("preserves compatibility on idempotent replay and fills supplier/request_item fallback from input bucket", async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: {
        status: "ok",
        proposals: [
          {
            bucket_index: 0,
            proposal_id: "proposal-1",
            proposal_no: "PR-1",
            supplier: null,
            request_item_ids: [],
            raw_status: "submitted",
            submitted_at: "2026-03-30T10:00:00.000Z",
            sent_to_accountant_at: null,
            submit_source: "rpc:proposal_submit_text_v1",
          },
        ],
        meta: {
          canonical_path: "rpc:proposal_submit_v3",
          client_mutation_id: "mutation-1",
          request_id: "request-1",
          idempotent_replay: true,
          expected_bucket_count: 1,
          expected_item_count: 1,
          created_proposal_count: 1,
          created_item_count: 1,
          attachment_continuation_ready: true,
        },
      },
      error: null,
    });

    const result = await createProposalsBySupplier(
      [
        {
          supplier: null,
          request_item_ids: ["ri-1"],
          meta: [{ request_item_id: "ri-1", price: "100", supplier: null, note: null }],
        },
      ],
      {
        buyerFio: "Buyer User",
        requestId: "request-1",
        clientMutationId: "mutation-1",
      },
    );

    expect(result.proposals[0]).toEqual(
      expect.objectContaining({
        supplier: "— без поставщика —",
        request_item_ids: ["ri-1"],
      }),
    );
    expect(result.meta).toEqual(
      expect.objectContaining({
        idempotent_replay: true,
        canonical_path: "rpc:proposal_submit_v3",
      }),
    );
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("recovers request/supplier duplicate conflicts as an existing proposal replay", async () => {
    mockedSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        status: 409,
        message:
          'duplicate key value violates unique constraint "proposals_uniq_req_supplier"',
        details: "Key (request_id, COALESCE(supplier, ''::text)) already exists.",
      },
    });

    const proposalQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(async () => ({
        data: [
          {
            id: "proposal-1",
            proposal_no: "PR-1",
            display_no: "PR-1",
            supplier: "Acme",
            status: "На утверждении",
            submitted_at: "2026-03-30T10:00:00.000Z",
            sent_to_accountant_at: null,
          },
        ],
        error: null,
      })),
    };
    const proposalItemsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn(async () => ({
        data: [{ request_item_id: "ri-1" }],
        error: null,
      })),
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "proposals") return proposalQuery;
      if (table === "proposal_items") return proposalItemsQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await createProposalsBySupplier(
      [
        {
          supplier: "Acme",
          request_item_ids: ["ri-1"],
          meta: [{ request_item_id: "ri-1", price: "100", supplier: "Acme", note: "n1" }],
        },
      ],
      {
        buyerFio: "Buyer User",
        requestId: "request-1",
        clientMutationId: "mutation-2",
      },
    );

    expect(mockedSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.from).toHaveBeenCalledWith("proposals");
    expect(mockedSupabase.from).toHaveBeenCalledWith("proposal_items");
    expect(proposalQuery.eq).toHaveBeenCalledWith("request_id", "request-1");
    expect(proposalQuery.eq).toHaveBeenCalledWith("supplier", "Acme");
    expect(proposalItemsQuery.eq).toHaveBeenCalledWith("proposal_id", "proposal-1");
    expect(proposalItemsQuery.in).toHaveBeenCalledWith("request_item_id", ["ri-1"]);
    expect(result.proposals).toEqual([
      expect.objectContaining({
        proposal_id: "proposal-1",
        supplier: "Acme",
        request_item_ids: ["ri-1"],
        visible_to_director: true,
      }),
    ]);
    expect(result.meta).toEqual(
      expect.objectContaining({
        client_mutation_id: "mutation-2",
        idempotent_replay: true,
        attachment_continuation_ready: true,
      }),
    );
  });
});
