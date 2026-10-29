import React, { useEffect, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { MfaChallengeScreen } from "./MfaChallengeScreen";
import { AuthAssuranceContext, type AuthAssuranceActions } from "./AuthAssuranceContext";
import { AuthAssuranceOverlay } from "./AuthAssuranceOverlay";

const mockList = jest.fn();
const mockChallenge = jest.fn();
const mockVerify = jest.fn();
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => void | (() => void)) => { require("react").useEffect(callback, [callback]); } }));
jest.mock("../../screens/security/SecurityScreen.auth.transport", () => ({
  listSecurityTotpFactors: () => mockList(),
  challengeSecurityTotpFactor: (...args: unknown[]) => mockChallenge(...args),
  verifySecurityTotpFactor: (...args: unknown[]) => mockVerify(...args),
}));
const factor = { id: "factor-a", friendly_name: "Authenticator", status: "verified" };
const factors = { data: { totp: [factor], all: [factor] }, error: null };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { resolve, promise }; }

describe("MFA challenge route", () => {
  let renderer: TestRenderer.ReactTestRenderer;
  let actions: AuthAssuranceActions;
  const root = () => renderer.root;
  const code = (value: string) => act(() => root().findByProps({ testID: "mfa-challenge-code" }).props.onChangeText(value));
  const verify = () => act(() => root().findByProps({ testID: "mfa-challenge-verify" }).props.onPress());
  const mount = async () => { await act(async () => { renderer = TestRenderer.create(<AuthAssuranceContext.Provider value={actions}><MfaChallengeScreen /></AuthAssuranceContext.Provider>); }); };
  beforeEach(() => {
    mockList.mockReset().mockResolvedValue(factors); mockChallenge.mockReset().mockResolvedValue({ data: { id: "challenge-a" }, error: null }); mockVerify.mockReset().mockResolvedValue({ data: {}, error: null });
    actions = { userId: "actor-a", required: true, recheck: jest.fn().mockResolvedValue(true), signOut: jest.fn().mockResolvedValue(true) };
  });
  afterEach(() => { if (renderer!) act(() => renderer.unmount()); });
  it("lists current verified factors and does not enroll or send a challenge on mount", async () => {
    await mount(); expect(mockList).toHaveBeenCalledTimes(1); expect(mockChallenge).not.toHaveBeenCalled(); expect(mockVerify).not.toHaveBeenCalled();
  });
  it("ignores pending factors rather than prompting for an unverified device", async () => {
    mockList.mockResolvedValue({ data: { totp: [{ ...factor, status: "unverified" }] }, error: null }); await mount();
    expect(root().findByProps({ testID: "mfa-challenge-code" }).props.editable).toBe(false); expect(mockChallenge).not.toHaveBeenCalled();
  });
  it("requires six digits and clears the submitted code before any asynchronous challenge", async () => {
    await mount(); code("12x3"); verify(); expect(mockChallenge).not.toHaveBeenCalled();
    const remote = deferred<{ data: { id: string }; error: null }>(); mockChallenge.mockReturnValue(remote.promise);
    code("123456"); verify(); verify();
    expect(mockChallenge).toHaveBeenCalledTimes(1); expect(root().findByProps({ testID: "mfa-challenge-code" }).props.value).toBe("");
    await act(async () => remote.resolve({ data: { id: "challenge-a" }, error: null }));
    expect(mockVerify).toHaveBeenCalledWith({ factorId: "factor-a", challengeId: "challenge-a", code: "123456" }); expect(actions.recheck).toHaveBeenCalledTimes(1);
  });
  it("never treats a provider verify error as an authenticated session or prints its raw response", async () => {
    mockVerify.mockResolvedValue({ data: null, error: { message: "sensitive-provider-response" } });
    await mount(); code("123456"); await act(async () => { verify(); });
    expect(actions.recheck).not.toHaveBeenCalled(); expect(JSON.stringify(renderer.toJSON())).not.toContain("sensitive-provider-response"); expect(root().findByProps({ testID: "mfa-challenge-code" }).props.value).toBe("");
  });
  it("ignores old factor responses after a principal change", async () => {
    const old = deferred<typeof factors>(); mockList.mockReturnValueOnce(old.promise); await mount();
    actions = { ...actions, userId: "actor-b" }; mockList.mockResolvedValue({ data: { totp: [{ ...factor, id: "factor-b" }] }, error: null });
    await act(async () => renderer.update(<AuthAssuranceContext.Provider value={actions}><MfaChallengeScreen /></AuthAssuranceContext.Provider>));
    await act(async () => old.resolve(factors)); code("123456"); await act(async () => { verify(); });
    expect(mockChallenge).toHaveBeenCalledWith("factor-b");
  });
  it("does not verify a late challenge after the route is unmounted", async () => {
    const remote = deferred<{ data: { id: string }; error: null }>(); mockChallenge.mockReturnValue(remote.promise);
    await mount(); code("123456"); verify(); act(() => renderer.unmount()); await act(async () => remote.resolve({ data: { id: "old-challenge" }, error: null }));
    expect(mockVerify).not.toHaveBeenCalled(); expect(actions.recheck).not.toHaveBeenCalled();
  });
  it("does not pretend sign-out succeeded when the provider rejects it", async () => {
    (actions.signOut as jest.Mock).mockResolvedValue(false); await mount(); await act(async () => root().findByProps({ testID: "mfa-challenge-exit" }).props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("Не удалось выйти"); expect(actions.recheck).not.toHaveBeenCalled();
  });
});

describe("auth recovery retains the existing navigator and form owners", () => {
  it("blocks input while checking without remounting or losing form state", () => {
    let mounts = 0, unmounts = 0; let setDraft!: (value: string) => void;
    const Form = () => { const [draft, change] = useState("draft-a"); setDraft = change; useEffect(() => { mounts++; return () => { unmounts++; }; }, []); return <Text>{draft}</Text>; };
    const actions = { onRetry: jest.fn().mockResolvedValue(true), onSignOut: jest.fn().mockResolvedValue(true) };
    const render = (blocked: boolean) => <AuthAssuranceOverlay {...actions} blocked={blocked} unavailable={blocked}><Form /></AuthAssuranceOverlay>;
    let renderer!: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(render(false)); }); act(() => setDraft("unsaved-edit"));
    act(() => renderer.update(render(true)));
    expect(rootStyle(renderer)).toEqual(expect.objectContaining({ display: "none" }));
    act(() => renderer.update(render(false))); expect(JSON.stringify(renderer.toJSON())).toContain("unsaved-edit"); expect(mounts).toBe(1); expect(unmounts).toBe(0);
    act(() => renderer.unmount()); expect(unmounts).toBe(1);
  });
});
function rootStyle(renderer: TestRenderer.ReactTestRenderer) { return renderer.root.findByProps({ testID: "auth-assurance-retained-content" }).props.style; }
