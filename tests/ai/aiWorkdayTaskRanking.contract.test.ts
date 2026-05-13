import {
  rankAiWorkdayTasks,
  riskForWorkdayMode,
  urgencyForWorkdayPriority,
} from "../../src/features/ai/workday/aiWorkdayTaskRanking";
import type { AiWorkdayTaskCard } from "../../src/features/ai/workday/aiWorkdayTaskTypes";

const baseCard: AiWorkdayTaskCard = {
  taskId: "workday.base",
  sourceCardId: "base",
  roleScope: ["director"],
  domain: "procurement",
  source: "task_stream:draft_ready",
  title: "Base",
  summary: "Base",
  riskLevel: "low",
  urgency: "monitor",
  evidenceRefs: [
    {
      type: "request",
      ref: "request:redacted",
      source: "procurement_request_context",
      redacted: true,
      rawPayloadStored: false,
      rawRowsReturned: false,
      rawPromptStored: false,
    },
  ],
  suggestedToolId: "compare_suppliers",
  suggestedMode: "safe_read",
  nextAction: "preview",
  approvalRequired: false,
  safeMode: true,
  classification: "SAFE_READ_RECOMMENDATION",
  blockCode: "NONE",
  policyReason: "ok",
  mutationCount: 0,
};

describe("AI proactive workday task ranking", () => {
  it("maps priority to urgency and tool mode to action risk", () => {
    expect(urgencyForWorkdayPriority("critical")).toBe("now");
    expect(urgencyForWorkdayPriority("high")).toBe("today");
    expect(riskForWorkdayMode({ mode: "safe_read", priority: "critical" })).toBe("medium");
    expect(riskForWorkdayMode({ mode: "draft_only", priority: "normal" })).toBe("medium");
    expect(riskForWorkdayMode({ mode: "approval_required", priority: "normal" })).toBe("high");
  });

  it("orders higher risk and urgency first without mutating input", () => {
    const cards = [
      baseCard,
      { ...baseCard, taskId: "workday.high", riskLevel: "high", urgency: "today", approvalRequired: true },
      { ...baseCard, taskId: "workday.medium", riskLevel: "medium", urgency: "now" },
    ] as const;

    expect(rankAiWorkdayTasks(cards).map((card) => card.taskId)).toEqual([
      "workday.high",
      "workday.medium",
      "workday.base",
    ]);
    expect(cards[0].taskId).toBe("workday.base");
  });
});
