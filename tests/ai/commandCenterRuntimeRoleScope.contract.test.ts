import { loadAiTaskStreamRuntime } from "../../src/features/ai/taskStream/aiTaskStreamRuntime";

const evidence = {
  finance: {
    summary: "Finance risk",
    evidenceRefs: ["finance:risk:1"],
    riskFlags: ["debt_present"],
    debtAmount: 10,
  },
  warehouse: {
    summary: "Warehouse risk",
    evidenceRefs: ["warehouse:risk:1"],
    lowStockFlags: ["reserved_pressure:cement"],
  },
  procurement: {
    summary: "Procurement action",
    materialIds: ["material-1"],
    evidenceRefs: ["procurement:risk:1"],
  },
  drafts: [
    {
      draftId: "own-act",
      draftKind: "act" as const,
      domain: "subcontracts" as const,
      summary: "Own act draft",
      evidenceRefs: ["contractor:own:1"],
      ownerUserIdHash: "contractor-user",
    },
    {
      draftId: "other-act",
      draftKind: "act" as const,
      domain: "subcontracts" as const,
      summary: "Other act draft",
      evidenceRefs: ["contractor:other:1"],
      ownerUserIdHash: "other-user",
    },
  ],
};

function cardDomains(role: Parameters<typeof loadAiTaskStreamRuntime>[0]["auth"]): string[] {
  return loadAiTaskStreamRuntime({
    auth: role,
    screenId: "ai.command.center",
    evidence,
    nowIso: "2026-05-12T10:00:00.000Z",
  }).cards.map((card) => card.domain);
}

describe("Command Center runtime role scope", () => {
  it("lets director/control receive cross-domain cards", () => {
    expect(cardDomains({ userId: "director-user", role: "director" })).toEqual(
      expect.arrayContaining(["finance", "warehouse", "marketplace", "subcontracts"]),
    );
    expect(cardDomains({ userId: "control-user", role: "control" })).toEqual(
      expect.arrayContaining(["finance", "warehouse", "marketplace"]),
    );
  });

  it("keeps non-director roles scoped", () => {
    expect(cardDomains({ userId: "foreman-user", role: "foreman" })).not.toContain("finance");
    expect(cardDomains({ userId: "buyer-user", role: "buyer" })).not.toContain("finance");
    expect(cardDomains({ userId: "accountant-user", role: "accountant" })).toEqual(["finance"]);
    expect(cardDomains({ userId: "warehouse-user", role: "warehouse" })).toEqual(["warehouse"]);
  });

  it("keeps contractor own-records-only and denies unknown role", () => {
    const contractor = loadAiTaskStreamRuntime({
      auth: { userId: "contractor-user", role: "contractor" },
      screenId: "ai.command.center",
      evidence,
    });
    expect(contractor.cards.map((card) => card.id)).toEqual(["runtime-draft-ready-own-act"]);

    expect(
      loadAiTaskStreamRuntime({
        auth: { userId: "unknown-user", role: "unknown" },
        screenId: "ai.command.center",
        evidence,
      }),
    ).toMatchObject({
      status: "blocked",
      cards: [],
    });
  });
});
