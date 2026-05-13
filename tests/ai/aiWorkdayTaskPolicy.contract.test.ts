import { evaluateAiWorkdayTaskPolicy } from "../../src/features/ai/workday/aiWorkdayTaskPolicy";

const evidenceRefs = [
  {
    type: "request" as const,
    ref: "request:redacted",
    source: "procurement_request_context" as const,
    redacted: true as const,
    rawPayloadStored: false as const,
    rawRowsReturned: false as const,
    rawPromptStored: false as const,
  },
];

describe("AI proactive workday task policy", () => {
  it("blocks unknown tool references", () => {
    expect(
      evaluateAiWorkdayTaskPolicy({
        role: "director",
        toolName: "unknown_tool",
        riskLevel: "low",
        evidenceRefs,
        approvalRequired: false,
      }),
    ).toMatchObject({
      allowed: false,
      knownTool: false,
      classification: "UNKNOWN_TOOL_BLOCKED",
      blockCode: "UNKNOWN_TOOL",
    });
  });

  it("blocks cards without evidence", () => {
    expect(
      evaluateAiWorkdayTaskPolicy({
        role: "buyer",
        toolName: "compare_suppliers",
        riskLevel: "low",
        evidenceRefs: [],
        approvalRequired: false,
      }),
    ).toMatchObject({
      allowed: false,
      classification: "INSUFFICIENT_EVIDENCE_BLOCKED",
      blockCode: "INSUFFICIENT_EVIDENCE",
    });
  });

  it("requires approval for high-risk recommendations", () => {
    expect(
      evaluateAiWorkdayTaskPolicy({
        role: "director",
        toolName: "compare_suppliers",
        riskLevel: "high",
        evidenceRefs,
        approvalRequired: false,
      }),
    ).toMatchObject({
      allowed: false,
      classification: "FORBIDDEN_RECOMMENDATION_BLOCKED",
      blockCode: "HIGH_RISK_WITHOUT_APPROVAL",
    });

    expect(
      evaluateAiWorkdayTaskPolicy({
        role: "director",
        toolName: "submit_for_approval",
        riskLevel: "high",
        evidenceRefs,
        approvalRequired: true,
      }),
    ).toMatchObject({
      allowed: true,
      suggestedMode: "approval_required",
      classification: "APPROVAL_REQUIRED_RECOMMENDATION",
      approvalRequired: true,
    });
  });
});
