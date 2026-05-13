import {
  AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT,
  buildAiWorkdayRuntimeEvidenceFromSafeReads,
} from "../../src/features/ai/workday/aiWorkdayLiveEvidenceBridge";
import { buildAiWorkdayTasks } from "../../src/features/ai/workday/aiWorkdayTaskEngine";

describe("AI workday live evidence bridge", () => {
  it("keeps the live evidence bridge safe-read only and redacted", () => {
    expect(AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT).toMatchObject({
      backendFirst: true,
      safeReadOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      uncontrolledExternalFetch: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      rawProviderPayloadReturned: false,
      fakeCards: false,
      hardcodedAiAnswer: false,
    });
  });

  it("converts bounded safe-read warehouse and finance DTOs into workday evidence", () => {
    const bridge = buildAiWorkdayRuntimeEvidenceFromSafeReads({
      warehouse: {
        rows: [
          {
            material_id: "material-redacted",
            qty_available: 0,
            qty_reserved: 10,
            qty_on_hand: 5,
          },
        ],
        totalRowCount: 1,
        hasMore: false,
        dtoOnly: true,
        rawRowsExposed: false,
      },
      finance: {
        payload: {
          summary: {
            total_debt: 100,
            overdue_count: 1,
            overdue_amount: 50,
          },
        },
        dtoOnly: true,
        rawRowsExposed: false,
      },
    });

    expect(bridge).toMatchObject({
      status: "loaded",
      evidenceSourceCount: 2,
      allEvidenceRedacted: true,
      mutationCount: 0,
      dbWrites: 0,
      rawRowsReturned: false,
    });
    expect(bridge.runtimeEvidence.warehouse?.evidenceRefs).toEqual([
      "warehouse:bounded_snapshot:redacted",
    ]);
    expect(bridge.runtimeEvidence.finance?.evidenceRefs).toEqual([
      "finance:bounded_summary:redacted",
    ]);

    const tasks = buildAiWorkdayTasks({
      auth: { userId: "director-user", role: "director" },
      runtimeEvidence: bridge.runtimeEvidence,
    });
    expect(tasks.status).toBe("loaded");
    expect(tasks.cards.length).toBeGreaterThanOrEqual(2);
    expect(tasks.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(tasks.mutationCount).toBe(0);
    expect(tasks.fakeCards).toBe(false);
  });

  it("returns an honest empty state when safe-read DTOs contain no eligible evidence", () => {
    const bridge = buildAiWorkdayRuntimeEvidenceFromSafeReads({
      warehouse: {
        rows: [],
        totalRowCount: 0,
        hasMore: false,
        dtoOnly: true,
        rawRowsExposed: false,
      },
      finance: {
        payload: { summary: { total_debt: 0, overdue_count: 0 } },
        dtoOnly: true,
        rawRowsExposed: false,
      },
    });

    expect(bridge).toMatchObject({
      status: "empty",
      evidenceSourceCount: 0,
      fakeCards: false,
      exactReason: expect.stringContaining("No eligible bounded safe-read evidence"),
    });
  });
});
