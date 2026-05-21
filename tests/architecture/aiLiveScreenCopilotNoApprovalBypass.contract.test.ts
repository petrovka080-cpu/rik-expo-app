import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no approval bypass", () => {
  it("keeps approvals as read-only references or required review states", () => {
    const source = joinedAiLiveScreenCopilotSources();
    expect(source).not.toMatch(/autoApproval:\s*true|approvalBypass:\s*true|approveDirectly|rejectDirectly/i);
  });
});
