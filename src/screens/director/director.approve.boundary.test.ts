import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import {
  ProposalActionBoundaryError,
  classifyProposalActionFailure,
  readbackApprovedProposalTruth,
  readbackSubmittedProposalTruth,
} from "../../lib/api/proposalActionBoundary";
import {
  DirectorApproveBoundaryError,
  runDirectorApprovePipelineAction,
} from "./director.approve.boundary";

const buildApproveSupabase = (params: {
  rpc?: { data?: unknown; error?: unknown };
  readback?: { data?: unknown; error?: unknown };
  readbackMany?: { data?: unknown; error?: unknown };
} = {}) => {
  const rpc = jest.fn(async () =>
    params.rpc ?? {
      data: {
        ok: true,
        purchase_id: "purchase-1",
        work_seed_ok: true,
        work_seed_error: null,
        idempotent_replay: false,
      },
      error: null,
    },
  );
  const maybeSingle = jest.fn(async () =>
    params.readback ?? {
      data: {
        id: "proposal-1",
        status: "sent_to_accountant",
        sent_to_accountant_at: "2026-04-16T09:00:00.000Z",
      },
      error: null,
    },
  );
  const inFn = jest.fn(async () => params.readbackMany ?? { data: [], error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq, in: inFn }));
  const from = jest.fn(() => ({ select }));

  return {
    supabase: { rpc, from } as never,
    rpc,
    from,
    select,
    eq,
    inFn,
    maybeSingle,
  };
};

describe("director approve boundary", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("publishes terminal success only after authoritative readback confirms accountant handoff", async () => {
    const harness = buildApproveSupabase();

    const result = await runDirectorApprovePipelineAction({
      supabase: harness.supabase,
      proposalId: "proposal-1",
      clientMutationId: "mutation-1",
    });

    expect(result).toEqual({
      proposalId: "proposal-1",
      purchaseId: "purchase-1",
      workSeedOk: true,
      workSeedError: null,
      idempotentReplay: false,
      terminalClass: "success",
      serverTruth: {
        proposalId: "proposal-1",
        status: "sent_to_accountant",
        sentToAccountantAt: "2026-04-16T09:00:00.000Z",
      },
    });
    expect(harness.rpc).toHaveBeenCalledWith("director_approve_pipeline_v1", {
      p_proposal_id: "proposal-1",
      p_comment: null,
      p_invoice_currency: "KGS",
      p_client_mutation_id: "mutation-1",
    });
    expect(harness.from).toHaveBeenCalledWith("proposals");
    expect(harness.eq).toHaveBeenCalledWith("id", "proposal-1");
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "director_approve_terminal_success",
      ),
    ).toBe(true);
  });

  it("does not publish approve success when readback is stale", async () => {
    const harness = buildApproveSupabase({
      readback: {
        data: {
          id: "proposal-1",
          status: "submitted",
          sent_to_accountant_at: null,
        },
        error: null,
      },
    });

    await expect(
      runDirectorApprovePipelineAction({
        supabase: harness.supabase,
        proposalId: "proposal-1",
        clientMutationId: "mutation-1",
      }),
    ).rejects.toMatchObject({
      terminalClass: "terminal_failure",
    });

    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "director_approve_terminal_success",
      ),
    ).toBe(false);
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "director_approve_terminal_failure",
      ),
    ).toBe(true);
  });

  it("classifies denied approve results without readback or speculative success", async () => {
    const harness = buildApproveSupabase({
      rpc: {
        data: {
          ok: false,
          failure_code: "permission_denied",
          failure_message: "director cannot approve this proposal",
        },
        error: null,
      },
    });

    await expect(
      runDirectorApprovePipelineAction({
        supabase: harness.supabase,
        proposalId: "proposal-1",
        clientMutationId: "mutation-1",
      }),
    ).rejects.toBeInstanceOf(DirectorApproveBoundaryError);

    expect(harness.from).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "director_approve_terminal_success",
      ),
    ).toBe(false);
  });

  it("keeps retryable approve failures typed for retry instead of false success", async () => {
    const harness = buildApproveSupabase({
      rpc: {
        data: null,
        error: { status: 503, message: "temporarily unavailable" },
      },
    });

    await expect(
      runDirectorApprovePipelineAction({
        supabase: harness.supabase,
        proposalId: "proposal-1",
        clientMutationId: "mutation-1",
      }),
    ).rejects.toMatchObject({
      terminalClass: "retryable_failure",
    });
    expect(classifyProposalActionFailure({ status: 503 })).toBe("retryable_failure");
    expect(harness.from).not.toHaveBeenCalled();
  });

  it("keeps approved readback authoritative when the server row is present", async () => {
    const harness = buildApproveSupabase({
      readback: {
        data: {
          id: "proposal-1",
          status: "sent_to_accountant",
          sent_to_accountant_at: "2026-04-21T10:00:00.000Z",
        },
        error: null,
      },
    });

    await expect(readbackApprovedProposalTruth(harness.supabase, "proposal-1")).resolves.toEqual({
      proposalId: "proposal-1",
      status: "sent_to_accountant",
      sentToAccountantAt: "2026-04-21T10:00:00.000Z",
    });
  });

  it("fails with a controlled boundary error instead of a null-row crash", async () => {
    const harness = buildApproveSupabase({
      readback: {
        data: null,
        error: null,
      },
    });

    await expect(readbackApprovedProposalTruth(harness.supabase, "proposal-1")).rejects.toMatchObject<
      Partial<ProposalActionBoundaryError>
    >({
      name: "ProposalActionBoundaryError",
      terminalClass: "terminal_failure",
      stage: "readback",
    });
  });

  it("rejects submitted readback rows that lose authoritative visibility", async () => {
    const harness = buildApproveSupabase({
      readbackMany: {
        data: [
          {
            id: "proposal-1",
            status: "draft",
            submitted_at: null,
            sent_to_accountant_at: null,
          },
        ],
        error: null,
      },
    });

    await expect(readbackSubmittedProposalTruth(harness.supabase, ["proposal-1"])).rejects.toMatchObject<
      Partial<ProposalActionBoundaryError>
    >({
      name: "ProposalActionBoundaryError",
      terminalClass: "terminal_failure",
      stage: "readback",
    });
  });
});
