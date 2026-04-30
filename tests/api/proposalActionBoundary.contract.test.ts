import { readFileSync } from "fs";
import { join } from "path";

import {
  ProposalActionBoundaryError,
  readbackSubmittedProposalTruth,
} from "../../src/lib/api/proposalActionBoundary";

jest.mock("../../src/lib/supabaseClient", () => ({ supabase: {} }));

type ReadbackResult = {
  data?: unknown;
  error?: unknown;
};

const sourcePath = join(__dirname, "..", "..", "src", "lib", "api", "proposalActionBoundary.ts");

const submittedRow = (id: string) => ({
  id,
  status: "submitted",
  submitted_at: "2026-04-30T10:00:00.000Z",
  sent_to_accountant_at: null,
});

const buildProposalReadbackSupabase = (results: Record<string, ReadbackResult>) => {
  const eqCalls: [string, string][] = [];
  const maybeSingleCalls: string[] = [];

  const supabase = {
    from: jest.fn((table: string) => ({
      select: jest.fn((columns: string) => ({
        eq: jest.fn((column: string, value: string) => {
          eqCalls.push([column, value]);
          return {
            maybeSingle: jest.fn(async () => {
              maybeSingleCalls.push(value);
              return results[value] ?? { data: null, error: null };
            }),
          };
        }),
      })),
    })),
  };

  return {
    supabase: supabase as never,
    from: supabase.from,
    eqCalls,
    maybeSingleCalls,
  };
};

describe("proposal action boundary readbacks", () => {
  it("uses one point lookup per deduped submitted proposal id and preserves input order", async () => {
    const harness = buildProposalReadbackSupabase({
      "proposal-2": { data: submittedRow("proposal-2"), error: null },
      "proposal-1": { data: submittedRow("proposal-1"), error: null },
    });

    await expect(
      readbackSubmittedProposalTruth(harness.supabase, [
        "proposal-2",
        "proposal-1",
        "proposal-2",
        " ",
      ]),
    ).resolves.toEqual([
      {
        proposalId: "proposal-2",
        status: "submitted",
        submittedAt: "2026-04-30T10:00:00.000Z",
        sentToAccountantAt: null,
      },
      {
        proposalId: "proposal-1",
        status: "submitted",
        submittedAt: "2026-04-30T10:00:00.000Z",
        sentToAccountantAt: null,
      },
    ]);

    expect(harness.from).toHaveBeenCalledTimes(2);
    expect(harness.from).toHaveBeenNthCalledWith(1, "proposals");
    expect(harness.eqCalls).toEqual([
      ["id", "proposal-2"],
      ["id", "proposal-1"],
    ]);
    expect(harness.maybeSingleCalls).toEqual(["proposal-2", "proposal-1"]);
  });

  it("fails closed when a submitted proposal point lookup is ambiguous", async () => {
    const harness = buildProposalReadbackSupabase({
      "proposal-1": {
        data: null,
        error: {
          code: "PGRST116",
          message: "JSON object requested, multiple rows returned",
        },
      },
    });

    await expect(
      readbackSubmittedProposalTruth(harness.supabase, ["proposal-1"]),
    ).rejects.toMatchObject<Partial<ProposalActionBoundaryError>>({
      name: "ProposalActionBoundaryError",
      action: "proposal_submit",
      stage: "readback",
      terminalClass: "terminal_failure",
    });

    expect(harness.eqCalls).toEqual([["id", "proposal-1"]]);
    expect(harness.maybeSingleCalls).toEqual(["proposal-1"]);
  });

  it("keeps proposal action checks as point lookups instead of unbounded id-list reads", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("async function readSubmittedProposalTruthRow");
    expect(source).toContain(".eq(\"id\", proposalId)");
    expect(source).toContain(".maybeSingle()");
    expect(source).not.toContain(".in(\"id\", ids)");
  });
});
