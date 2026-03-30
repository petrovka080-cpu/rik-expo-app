jest.mock("../supabaseClient", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

import { supabase } from "../supabaseClient";
import { createProposalsBySupplier } from "./catalog.proposalCreation.service";

const mockedSupabase = supabase as unknown as {
  rpc: jest.Mock;
  from: jest.Mock;
};

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
});
