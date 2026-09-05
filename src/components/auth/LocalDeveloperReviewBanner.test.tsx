import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

const mockSwitchLocalDeveloperPrincipal = jest.fn();

jest.mock("../../lib/localDeveloperReview", () => ({
  isLocalDeveloperReviewEnabled: () => true,
  LOCAL_DEVELOPER_REVIEW_ROLES: ["director", "estimator"],
  switchLocalDeveloperPrincipal: (...args: unknown[]) =>
    mockSwitchLocalDeveloperPrincipal(...args),
}));

import { LocalDeveloperReviewBanner } from "./LocalDeveloperReviewBanner";

describe("LocalDeveloperReviewBanner", () => {
  beforeEach(() => {
    mockSwitchLocalDeveloperPrincipal.mockReset().mockResolvedValue(undefined);
  });

  it("automatically establishes one director session when local review has no role", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LocalDeveloperReviewBanner authenticatedRole={null} />,
      );
    });

    expect(mockSwitchLocalDeveloperPrincipal).toHaveBeenCalledTimes(1);
    expect(mockSwitchLocalDeveloperPrincipal).toHaveBeenCalledWith("director");

    await act(async () => {
      renderer!.update(<LocalDeveloperReviewBanner authenticatedRole={null} />);
    });
    expect(mockSwitchLocalDeveloperPrincipal).toHaveBeenCalledTimes(1);
  });

  it("keeps an existing authenticated role without replacing it", async () => {
    await act(async () => {
      TestRenderer.create(
        <LocalDeveloperReviewBanner authenticatedRole="estimator" />,
      );
    });

    expect(mockSwitchLocalDeveloperPrincipal).not.toHaveBeenCalled();
  });
});
