import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

const mockRestoreLocalDeveloperOwnerSession = jest.fn();
const mockLoadDeveloperOverrideContext = jest.fn();
const mockSetDeveloperEffectiveRole = jest.fn();

const entitledContext = (activeEffectiveRole: string) => ({
  actorUserId: "owner-user",
  actorRole: "platform_developer",
  entitlement: "platform_developer",
  authorizationSource: "server_entitlement",
  isEnabled: true,
  isActive: true,
  allowedRoles: ["director", "estimator"],
  activeEffectiveRole,
  canAccessAllOfficeRoutes: true,
  canImpersonateForMutations: true,
  expiresAt: null,
  reason: "dedicated local owner",
});

jest.mock("../../lib/localDeveloperReview", () => ({
  isLocalDeveloperReviewEnabled: () => true,
  LOCAL_DEVELOPER_REVIEW_ROLES: ["director", "estimator"],
  restoreLocalDeveloperOwnerSession: (...args: unknown[]) =>
    mockRestoreLocalDeveloperOwnerSession(...args),
}));

jest.mock("../../lib/developerOverride", () => ({
  isServerAuthorizedPlatformDeveloper: (context: { actorRole?: string } | null) =>
    context?.actorRole === "platform_developer",
  loadDeveloperOverrideContext: (...args: unknown[]) =>
    mockLoadDeveloperOverrideContext(...args),
  setDeveloperEffectiveRole: (...args: unknown[]) =>
    mockSetDeveloperEffectiveRole(...args),
}));

import { LocalDeveloperReviewBanner } from "./LocalDeveloperReviewBanner";

describe("LocalDeveloperReviewBanner", () => {
  beforeEach(() => {
    mockRestoreLocalDeveloperOwnerSession.mockReset().mockResolvedValue(undefined);
    mockLoadDeveloperOverrideContext.mockReset().mockResolvedValue(entitledContext("director"));
    mockSetDeveloperEffectiveRole.mockReset().mockImplementation(async (role: string) =>
      entitledContext(role),
    );
  });

  it("automatically restores the dedicated owner once when local review has no session", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LocalDeveloperReviewBanner authenticatedRole={null} />,
      );
    });

    expect(mockRestoreLocalDeveloperOwnerSession).toHaveBeenCalledTimes(1);
    expect(mockLoadDeveloperOverrideContext).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByProps({ testID: "local-developer-active-role" }).props.children)
      .toBe("Директор");

    await act(async () => {
      renderer!.update(<LocalDeveloperReviewBanner authenticatedRole={null} />);
    });
    expect(mockRestoreLocalDeveloperOwnerSession).toHaveBeenCalledTimes(1);
  });

  it("keeps an existing owner session and verifies its server entitlement", async () => {
    await act(async () => {
      TestRenderer.create(
        <LocalDeveloperReviewBanner authenticatedRole="platform_developer" />,
      );
    });

    expect(mockRestoreLocalDeveloperOwnerSession).not.toHaveBeenCalled();
    expect(mockLoadDeveloperOverrideContext).toHaveBeenCalledTimes(1);
  });

  it("waits for canonical auth hydration before restoring the owner", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LocalDeveloperReviewBanner
          authenticatedRole={null}
          authSessionResolved={false}
          hasAuthenticatedSession={false}
        />,
      );
    });
    expect(mockRestoreLocalDeveloperOwnerSession).not.toHaveBeenCalled();
    expect(mockLoadDeveloperOverrideContext).not.toHaveBeenCalled();

    await act(async () => {
      renderer!.update(
        <LocalDeveloperReviewBanner
          authenticatedRole={null}
          authSessionResolved
          hasAuthenticatedSession={false}
        />,
      );
    });
    expect(mockRestoreLocalDeveloperOwnerSession).toHaveBeenCalledTimes(1);
    expect(mockLoadDeveloperOverrideContext).toHaveBeenCalledTimes(1);
  });

  it("does not replace an authenticated actor while role metadata is warming", async () => {
    await act(async () => {
      TestRenderer.create(
        <LocalDeveloperReviewBanner
          authenticatedRole={null}
          authSessionResolved
          hasAuthenticatedSession
        />,
      );
    });

    expect(mockRestoreLocalDeveloperOwnerSession).not.toHaveBeenCalled();
    expect(mockLoadDeveloperOverrideContext).toHaveBeenCalledTimes(1);
  });

  it("changes only the server-owned effective role, not the provider principal", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LocalDeveloperReviewBanner authenticatedRole="platform_developer" />,
      );
    });
    await act(async () => {
      renderer!.root.findByProps({ testID: "local-developer-role-toggle" }).props.onPress();
    });
    await act(async () => {
      renderer!.root.findByProps({ testID: "local-developer-role-estimator" }).props.onPress();
    });

    expect(mockSetDeveloperEffectiveRole).toHaveBeenCalledWith("estimator");
    expect(mockRestoreLocalDeveloperOwnerSession).not.toHaveBeenCalled();
    expect(renderer!.root.findByProps({ testID: "local-developer-active-role" }).props.children)
      .toBe("Сметчик");
  });
});
