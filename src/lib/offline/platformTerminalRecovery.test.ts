import {
  clearLocalRecoveryState,
  isDraftLike,
  isRecoverable,
  isTerminal,
  shouldAllowRetry,
  shouldRenderRecoveryUI,
  type PlatformLocalRecoveryCleanupTarget,
} from "./platformTerminalRecovery";

describe("platform terminal/recovery contract", () => {
  it("does not treat unknown or empty status as draft-like", () => {
    expect(isDraftLike({ kind: "request", status: null })).toBe(false);
    expect(isDraftLike({ kind: "request", status: "" })).toBe(false);
  });

  it("classifies terminal request as neither draft-like nor recoverable", () => {
    const remoteTruth = {
      kind: "request" as const,
      entityId: "REQ-0121/2026",
      status: "approved",
    };
    const local = {
      hasSnapshot: true,
      syncStatus: "retry_wait" as const,
      pendingCount: 1,
      retryCount: 2,
      hasModalSource: true,
    };

    expect(isTerminal(remoteTruth)).toBe(true);
    expect(isDraftLike(remoteTruth)).toBe(false);
    expect(isRecoverable({ remoteTruth, local })).toBe(false);
    expect(shouldRenderRecoveryUI({ remoteTruth, local })).toBe(false);
    expect(shouldAllowRetry({ remoteTruth, local })).toBe(false);
  });

  it("keeps actual unresolved local sync recoverable when remote truth is active", () => {
    const remoteTruth = {
      kind: "warehouse_receive" as const,
      entityId: "incoming-1",
      status: "pending",
      remainingCount: 3,
    };
    const local = {
      hasLocalState: true,
      syncStatus: "retry_wait" as const,
      pendingCount: 1,
    };

    expect(isTerminal(remoteTruth)).toBe(false);
    expect(isRecoverable({ remoteTruth, local })).toBe(true);
    expect(shouldRenderRecoveryUI({ remoteTruth, local })).toBe(true);
    expect(shouldAllowRetry({ remoteTruth, local })).toBe(true);
  });

  it("treats warehouse receive with no remaining quantity as terminal", () => {
    const remoteTruth = {
      kind: "warehouse_receive" as const,
      entityId: "incoming-complete",
      status: "pending",
      remainingCount: 0,
    };

    expect(isTerminal(remoteTruth)).toBe(true);
    expect(shouldRenderRecoveryUI({
      remoteTruth,
      local: { syncStatus: "queued", pendingCount: 1 },
    })).toBe(false);
  });

  it("uses typed cleanup adapters for entity-bound local recovery owners", async () => {
    const adapter = {
      clearLocalRecoveryState: jest.fn(async (target: PlatformLocalRecoveryCleanupTarget) => ({
        ...target,
        cleared: true,
        clearedOwners: ["owner-a", "owner-b"],
      })),
    };

    await expect(
      clearLocalRecoveryState(adapter, {
        kind: "proposal",
        entityId: "proposal-1",
      }),
    ).resolves.toMatchObject({
      kind: "proposal",
      entityId: "proposal-1",
      cleared: true,
      clearedOwners: ["owner-a", "owner-b"],
    });
    expect(adapter.clearLocalRecoveryState).toHaveBeenCalledWith({
      kind: "proposal",
      entityId: "proposal-1",
    });
  });

  it("covers buyer/accountant neighboring entity semantics without local recovery UI", () => {
    expect(isTerminal({ kind: "proposal", status: "approved" })).toBe(true);
    expect(shouldAllowRetry({
      remoteTruth: { kind: "proposal", status: "approved" },
      local: { syncStatus: "retry_wait", pendingCount: 1 },
    })).toBe(false);
    expect(isTerminal({ kind: "payment", status: "paid" })).toBe(true);
    expect(shouldRenderRecoveryUI({
      remoteTruth: { kind: "payment", status: "paid" },
      local: { hasModalSource: true },
    })).toBe(false);
  });
});
