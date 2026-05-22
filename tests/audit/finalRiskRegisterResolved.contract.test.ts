import { buildFinal50k92ScoreReaudit } from "../../scripts/audit/final50k92ScoreReaudit.shared";

describe("final 50k 9.2 risk register", () => {
  it("leaves no local P0 and reports only exact external P1 blockers when live proofs are absent", () => {
    const report = buildFinal50k92ScoreReaudit();
    const risks = report.riskRegister.risks;
    const blockers = risks.map((risk) => risk.external_blocker).sort();
    const expectedBlockers = (report.matrix.external_blockers as string[]).slice().sort();

    expect(report.riskRegister.p0_remaining).toBe(0);
    expect(report.riskRegister.p1_remaining).toBe(expectedBlockers.length);
    expect(blockers).toEqual(expectedBlockers);
    expect(risks.every((risk) => risk.severity === "P1")).toBe(true);
    expect(risks.every((risk) => risk.blocks_9_2)).toBe(true);
    expect(risks.every((risk) => risk.blocks_production_50k_claim)).toBe(true);
  });
});
