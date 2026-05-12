import {
  buildAiCommandCenterViewModel,
} from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";
import type { AiUserRole } from "../../src/features/ai/policy/aiRolePolicy";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

function visibleIds(role: AiUserRole, userId = `${role}-user`): string[] {
  return buildAiCommandCenterViewModel({
    auth: { userId, role },
    sourceCards: aiCommandCenterTaskCards,
  }).cards.map((card) => card.id);
}

describe("AI Command Center role scope", () => {
  it("lets director and control see cross-domain cards", () => {
    const directorIds = visibleIds("director", "director-user");
    expect(new Set(directorIds)).toEqual(new Set([
      "approval-pending-1",
      "finance-risk-1",
      "supplier-compare-1",
      "warehouse-low-1",
      "contractor-own-doc-1",
      "contractor-other-doc-1",
      "draft-request-1",
      "report-ready-1",
      "submit-request-1",
    ]));
    expect(visibleIds("control", "control-user")).toHaveLength(directorIds.length);
  });

  it("keeps foreman out of full finance while allowing project/report/procurement work", () => {
    const ids = visibleIds("foreman", "foreman-user");
    expect(ids).toEqual(["draft-request-1", "report-ready-1", "submit-request-1"]);
    expect(ids).not.toContain("finance-risk-1");
  });

  it("keeps buyer out of accounting postings and warehouse finance cards", () => {
    const ids = visibleIds("buyer", "buyer-user");
    expect(ids).toEqual(["supplier-compare-1", "draft-request-1", "submit-request-1"]);
    expect(ids).not.toContain("finance-risk-1");
    expect(ids).not.toContain("warehouse-low-1");
  });

  it("keeps accountant scoped to finance and documents, not supplier confirmation", () => {
    const ids = visibleIds("accountant", "accountant-user");
    expect(ids).toEqual(["finance-risk-1"]);
    expect(ids).not.toContain("supplier-compare-1");
  });

  it("keeps warehouse out of finance", () => {
    expect(visibleIds("warehouse", "warehouse-user")).toEqual(["warehouse-low-1"]);
  });

  it("keeps contractor own-records-only policy", () => {
    expect(visibleIds("contractor", "contractor-user")).toEqual(["contractor-own-doc-1"]);
    expect(visibleIds("contractor", "other-contractor-user")).toEqual([
      "contractor-other-doc-1",
    ]);
  });

  it("denies unknown role by default", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "unknown-user", role: "unknown" },
      sourceCards: aiCommandCenterTaskCards,
    });
    expect(vm.denied).toBe(true);
    expect(vm.cards).toEqual([]);
  });
});
