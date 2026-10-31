import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { Session } from "@supabase/supabase-js";
import { useMfaSessionAssuranceGate, type MfaSessionGateCallbacks } from "./useMfaSessionAssuranceGate";
import type { MfaAssuranceDecision } from "./mfaAssurance.auth.transport";

const mockReadAssurance = jest.fn();
jest.mock("./mfaAssurance.auth.transport", () => ({
  readMfaAssuranceForSessionToken: (jwt: string) => mockReadAssurance(jwt),
}));
const ready: MfaAssuranceDecision = { status: "not_required", currentLevel: "aal1", nextLevel: "aal1" };
const required: MfaAssuranceDecision = { status: "challenge_required", currentLevel: "aal1", nextLevel: "aal2" };
const context = { reason: "auth_event_authenticated", warmRole: true } as const;
const session = (id = "actor-a", token = "token-a"): Session => ({
  access_token: token, refresh_token: "fixture-refresh", token_type: "bearer", expires_in: 3600,
  user: { id, aud: "authenticated", created_at: "2026-10-29T00:00:00Z", app_metadata: {}, user_metadata: {} },
});
function deferred() {
  let resolve!: (decision: MfaAssuranceDecision) => void;
  const promise = new Promise<MfaAssuranceDecision>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("single-lifecycle MFA assurance check owner", () => {
  let gate: ReturnType<typeof useMfaSessionAssuranceGate>;
  let renderer: TestRenderer.ReactTestRenderer;
  let callbacks: MfaSessionGateCallbacks;
  const Harness = ({ value }: { value: MfaSessionGateCallbacks }) => { gate = useMfaSessionAssuranceGate(value); return null; };
  const flush = async () => { await act(async () => { jest.runOnlyPendingTimers(); await Promise.resolve(); }); };
  const start = (value = session()) => { let result!: Promise<boolean>; act(() => { result = gate.checkSession(value, context); }); return result; };
  beforeEach(() => {
    jest.useFakeTimers(); mockReadAssurance.mockReset().mockResolvedValue(ready);
    callbacks = { onAllowed: jest.fn(), onRequired: jest.fn(), onUnavailable: jest.fn() };
    act(() => { renderer = TestRenderer.create(<Harness value={callbacks} />); });
  });
  afterEach(() => { act(() => renderer.unmount()); jest.useRealTimers(); });

  it("defers SDK work until the synchronous auth callback has returned", async () => {
    const result = start();
    expect(gate.status).toBe("checking"); expect(mockReadAssurance).not.toHaveBeenCalled();
    await flush(); await expect(result).resolves.toBe(true);
    expect(mockReadAssurance).toHaveBeenCalledWith("token-a");
    expect(callbacks.onAllowed).toHaveBeenCalledWith(session(), context);
    expect(gate.status).toBe("idle"); expect(callbacks.onRequired).not.toHaveBeenCalled();
  });

  it("routes a verified-factor AAL1 session to the required callback without allowing it", async () => {
    mockReadAssurance.mockResolvedValue(required); const result = start(); await flush();
    await expect(result).resolves.toBe(false); expect(callbacks.onRequired).toHaveBeenCalledWith(session());
    expect(callbacks.onAllowed).not.toHaveBeenCalled(); expect(gate.status).toBe("idle");
  });

  it("keeps provider failure unavailable rather than treating it as a missing factor", async () => {
    mockReadAssurance.mockRejectedValue(new Error("private-provider-message")); const result = start(); await flush();
    await expect(result).resolves.toBe(false); expect(gate.status).toBe("unavailable");
    expect(callbacks.onUnavailable).toHaveBeenCalledWith(); expect(callbacks.onAllowed).not.toHaveBeenCalled();
    expect(callbacks.onRequired).not.toHaveBeenCalled();
  });

  it("ignores an older in-flight actor even if its challenge result arrives last", async () => {
    const first = deferred(), second = deferred();
    mockReadAssurance.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const oldResult = start(); await flush(); const newResult = start(session("actor-b", "token-b"));
    await expect(oldResult).resolves.toBe(false); await flush();
    await act(async () => { second.resolve(ready); }); await expect(newResult).resolves.toBe(true);
    await act(async () => { first.resolve(required); });
    expect(callbacks.onAllowed).toHaveBeenCalledTimes(1); expect(callbacks.onAllowed).toHaveBeenCalledWith(session("actor-b", "token-b"), context);
    expect(callbacks.onRequired).not.toHaveBeenCalled(); expect(gate.status).toBe("idle");
  });

  it("cancels a queued check before any SDK work starts", async () => {
    const result = start(); act(() => gate.cancel()); await flush();
    await expect(result).resolves.toBe(false); expect(mockReadAssurance).not.toHaveBeenCalled();
    expect(callbacks.onAllowed).not.toHaveBeenCalled(); expect(gate.status).toBe("idle");
  });

  it("terminal cancellation prevents an already-running response from restoring a session", async () => {
    const remote = deferred(); mockReadAssurance.mockReturnValue(remote.promise);
    const result = start(); await flush(); act(() => gate.cancel());
    await expect(result).resolves.toBe(false); await act(async () => remote.resolve(ready));
    expect(callbacks.onAllowed).not.toHaveBeenCalled(); expect(gate.status).toBe("idle");
  });

  it("unmount resolves the outstanding caller and drops its late provider response", async () => {
    const remote = deferred(); mockReadAssurance.mockReturnValue(remote.promise);
    const result = start(); await flush(); act(() => renderer.unmount());
    await expect(result).resolves.toBe(false); await act(async () => remote.resolve(required));
    expect(callbacks.onRequired).not.toHaveBeenCalled(); expect(callbacks.onAllowed).not.toHaveBeenCalled();
  });

  it("captures the token and principal before deferring rather than following later caller mutation", async () => {
    const value = session(); const result = start(value); value.access_token = "changed"; value.user.id = "changed";
    await flush(); await expect(result).resolves.toBe(true);
    expect(mockReadAssurance).toHaveBeenCalledWith("token-a");
    expect(callbacks.onAllowed).toHaveBeenCalledWith(session(), context);
  });

  it("does not let a settled callback erase a reentrant newer check's pending state", async () => {
    const next = deferred(); mockReadAssurance.mockResolvedValueOnce(ready).mockReturnValueOnce(next.promise);
    let newer!: Promise<boolean>;
    callbacks.onAllowed = jest.fn((value) => { if (value.user.id === "actor-a") newer = gate.checkSession(session("actor-b", "token-b"), context); });
    act(() => renderer.update(<Harness value={callbacks} />));
    const oldResult = start(); await flush(); await expect(oldResult).resolves.toBe(false);
    expect(gate.status).toBe("checking"); await flush(); await act(async () => next.resolve(ready));
    await expect(newer).resolves.toBe(true); expect(gate.status).toBe("idle");
  });

  it("delivers to the current lifecycle callbacks rather than an obsolete render closure", async () => {
    const remote = deferred(); mockReadAssurance.mockReturnValue(remote.promise);
    const result = start(); await flush(); const nextCallbacks = { ...callbacks, onAllowed: jest.fn() };
    act(() => renderer.update(<Harness value={nextCallbacks} />)); await act(async () => remote.resolve(ready));
    await expect(result).resolves.toBe(true); expect(nextCallbacks.onAllowed).toHaveBeenCalledTimes(1);
    expect(callbacks.onAllowed).not.toHaveBeenCalled();
  });

  it("keeps the gate unavailable if the accepting lifecycle callback fails", async () => {
    callbacks.onAllowed = jest.fn(() => { throw new Error("callback failure"); });
    act(() => renderer.update(<Harness value={callbacks} />)); const result = start(); await flush();
    await expect(result).resolves.toBe(false); expect(gate.status).toBe("unavailable");
  });

  it("can retry an unavailable check without retaining the failed result", async () => {
    mockReadAssurance.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(ready);
    const first = start(); await flush(); await expect(first).resolves.toBe(false);
    const second = start(); await flush(); await expect(second).resolves.toBe(true);
    expect(gate.status).toBe("idle"); expect(callbacks.onAllowed).toHaveBeenCalledTimes(1);
  });
  it("an unavailable session read cancels the previous provider result", async () => {
    const remote = deferred(); mockReadAssurance.mockReturnValue(remote.promise);
    const result = start(); await flush(); act(() => gate.markUnavailable());
    await expect(result).resolves.toBe(false); await act(async () => remote.resolve(ready));
    expect(gate.status).toBe("unavailable"); expect(callbacks.onAllowed).not.toHaveBeenCalled();
  });
  it("closes access immediately while the existing lifecycle reads a resume session", () => {
    act(() => gate.beginSessionRead()); expect(gate.status).toBe("checking"); expect(mockReadAssurance).not.toHaveBeenCalled();
  });
});
