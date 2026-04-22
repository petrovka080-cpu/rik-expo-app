import { readFileSync } from "fs";
import { join } from "path";

import {
  invalidateForemanDraftBoundaryRequestDetailsLoads,
  loadForemanDraftBoundaryRequestDetails,
} from "../../src/screens/foreman/foreman.draftBoundary.requestDetails";
import { loadForemanRequestDetails } from "../../src/screens/foreman/foreman.draftBoundary.helpers";

jest.mock("../../src/screens/foreman/foreman.draftBoundary.helpers", () => ({
  loadForemanRequestDetails: jest.fn(async () => null),
}));

const mockLoadForemanRequestDetails = loadForemanRequestDetails as unknown as jest.Mock;

describe("foreman draft boundary request-details controller", () => {
  beforeEach(() => {
    mockLoadForemanRequestDetails.mockClear();
  });

  it("stays free of React hooks and fetch ownership beyond the delegated helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.requestDetails.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("useState");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).toContain("loadForemanRequestDetails");
  });

  it("invalidates stale request-detail loads through the shared sequence ref", async () => {
    const requestDetailsLoadSeqRef = { current: 0 };
    const setRequestDetails = jest.fn();
    const setDisplayNoByReq = jest.fn();
    const syncHeaderFromDetails = jest.fn();

    await loadForemanDraftBoundaryRequestDetails(
      {
        requestDetailsLoadSeqRef,
        requestId: "req-1",
        setRequestDetails,
        setDisplayNoByReq,
        syncHeaderFromDetails,
      },
      "req-target",
    );

    const firstCall = mockLoadForemanRequestDetails.mock.calls[0]?.[0] as {
      shouldApply: () => boolean;
    };
    expect(firstCall.shouldApply()).toBe(true);

    invalidateForemanDraftBoundaryRequestDetailsLoads(requestDetailsLoadSeqRef);
    expect(firstCall.shouldApply()).toBe(false);
  });

  it("makes only the latest request-details load eligible to apply", async () => {
    const requestDetailsLoadSeqRef = { current: 0 };
    const deps = {
      requestDetailsLoadSeqRef,
      requestId: "req-active",
      setRequestDetails: jest.fn(),
      setDisplayNoByReq: jest.fn(),
      syncHeaderFromDetails: jest.fn(),
    };

    await loadForemanDraftBoundaryRequestDetails(deps, "req-first");
    await loadForemanDraftBoundaryRequestDetails(deps, "req-second");

    const firstCall = mockLoadForemanRequestDetails.mock.calls[0]?.[0] as {
      shouldApply: () => boolean;
    };
    const secondCall = mockLoadForemanRequestDetails.mock.calls[1]?.[0] as {
      shouldApply: () => boolean;
    };

    expect(firstCall.shouldApply()).toBe(false);
    expect(secondCall.shouldApply()).toBe(true);
  });
});
