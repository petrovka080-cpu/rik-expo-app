import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ProtectedIdentityBoundary } from "./ProtectedIdentityBoundary";

const mockLoadProtectedIdentity = jest.fn();
const mockSignOutSafely = jest.fn();
const mockRouterBack = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: (...args: unknown[]) => mockRouterBack(...args),
    replace: jest.fn(),
  },
}));

jest.mock("../../lib/auth/protectedIdentity.transport", () => ({
  loadProtectedIdentity: (...args: unknown[]) => mockLoadProtectedIdentity(...args),
}));

jest.mock("../../lib/supabaseClient", () => ({
  signOutSafely: (...args: unknown[]) => mockSignOutSafely(...args),
}));

describe("ProtectedIdentityBoundary unavailable configuration", () => {
  beforeEach(() => {
    mockLoadProtectedIdentity.mockReset().mockResolvedValue({
      status: "configuration_unavailable",
      reason: "missing_public_url",
      diagnostic:
        '{"status":"unavailable","reason":"missing_public_url","secretsIncluded":false}',
    });
    mockSignOutSafely.mockReset();
  });

  it("renders ConfigRecoveryState without touching the provider sign-out path", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ProtectedIdentityBoundary returnTo="/profile" surface="profile">
          protected-content
        </ProtectedIdentityBoundary>,
      );
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "config-recovery-state" })).toBeTruthy();
    expect(renderer!.root.findAllByProps({ testID: "protected-identity-sign-out" })).toHaveLength(0);
    expect(mockSignOutSafely).not.toHaveBeenCalled();
  });
});
