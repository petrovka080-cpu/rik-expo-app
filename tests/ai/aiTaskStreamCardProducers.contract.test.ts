import {
  AI_TASK_STREAM_CARD_PRODUCERS,
  financeRiskProducer,
  procurementNextActionProducer,
  warehouseStatusProducer,
} from "../../src/features/ai/taskStream/aiTaskStreamCardProducers";

const nowIso = "2026-05-12T10:00:00.000Z";

describe("AI task stream card producers", () => {
  it("registers production-safe producer metadata", () => {
    expect(AI_TASK_STREAM_CARD_PRODUCERS.map((producer) => producer.metadata.name)).toEqual([
      "warehouseStatusProducer",
      "draftReadyProducer",
      "approvalPendingProducer",
      "procurementNextActionProducer",
      "financeRiskProducer",
      "reportReadyProducer",
    ]);
    expect(
      AI_TASK_STREAM_CARD_PRODUCERS.every(
        (producer) =>
          producer.metadata.evidenceRequired === true &&
          producer.metadata.mutation_count === 0 &&
          producer.metadata.maxCards > 0,
      ),
    ).toBe(true);
  });

  it("returns no fake card when evidence is missing", () => {
    const result = warehouseStatusProducer.produce({
      auth: { userId: "warehouse-user", role: "warehouse" },
      screenId: "ai.command.center",
      nowIso,
      evidence: {},
    });

    expect(result).toEqual({ cards: [], evidenceRefs: [], blocks: [] });
  });

  it("denies role-scoped producers outside their domains", () => {
    const warehouse = warehouseStatusProducer.produce({
      auth: { userId: "accountant-user", role: "accountant" },
      screenId: "ai.command.center",
      nowIso,
      evidence: {
        warehouse: {
          summary: "Warehouse evidence",
          evidenceRefs: ["warehouse:stock:1"],
        },
      },
    });
    expect(warehouse.cards).toEqual([]);

    const procurement = procurementNextActionProducer.produce({
      auth: { userId: "accountant-user", role: "accountant" },
      screenId: "ai.command.center",
      nowIso,
      evidence: {
        procurement: {
          summary: "Procurement evidence",
          materialIds: ["material-1"],
          evidenceRefs: ["procurement:evidence:1"],
        },
      },
    });
    expect(procurement.cards).toEqual([]);
  });

  it("creates evidence-backed safe-read cards only when a producer has evidence", () => {
    const result = financeRiskProducer.produce({
      auth: { userId: "director-user", role: "director" },
      screenId: "ai.command.center",
      nowIso,
      evidence: {
        finance: {
          summary: "Debt needs review",
          evidenceRefs: ["finance:summary:totals"],
          riskFlags: ["debt_present"],
          debtAmount: 10,
        },
      },
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      type: "finance_risk",
      domain: "finance",
      recommendedToolName: "get_finance_summary",
      requiresApproval: false,
    });
    expect(result.cards[0].evidenceRefs).toEqual(["finance:summary:totals"]);
  });
});
