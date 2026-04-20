/* eslint-disable import/first */
const mockRootRouterReplace = jest.fn();
const mockRootRouterPush = jest.fn();
const mockRunAfterInteractions = jest.fn((callback: () => void) => {
  callback();
  return { cancel: jest.fn() };
});

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockRootRouterPush(...args),
    replace: (...args: unknown[]) => mockRootRouterReplace(...args),
  },
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
  },
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => mockRunAfterInteractions(callback),
  },
}));

import { Platform } from "react-native";
import {
  createPdfDocumentViewerHref,
  pushPdfDocumentViewerRouteSafely,
} from "../../src/lib/documents/pdfDocumentViewerEntry";

describe("pdfDocumentViewerEntry", () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    mockRootRouterReplace.mockReset();
    mockRootRouterPush.mockReset();
    mockRunAfterInteractions.mockReset();
    mockRunAfterInteractions.mockImplementation((callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
  });

  it("builds the shared viewer href with trimmed and encoded route params", () => {
    const result = createPdfDocumentViewerHref(" session 1 ", " token/1 ");

    expect(result).toEqual({
      safeSessionId: "session 1",
      safeOpenToken: "token/1",
      href: "/pdf-viewer?sessionId=session%201&openToken=token%2F1",
    });
  });

  it("rejects an empty session id before navigation can start", () => {
    expect(() => createPdfDocumentViewerHref("   ", "token")).toThrow(
      "PDF viewer navigation requires a non-empty sessionId",
    );
  });

  it("uses root push on web so the viewer back action can return to the opener", async () => {
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    await pushPdfDocumentViewerRouteSafely(
      router,
      "/pdf-viewer?sessionId=session-1&openToken=" as Parameters<typeof pushPdfDocumentViewerRouteSafely>[1],
    );

    expect(mockRootRouterPush).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-1&openToken=");
    expect(mockRootRouterReplace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockRunAfterInteractions).not.toHaveBeenCalled();
  });

  it("uses root push on iOS to avoid cross navigator replace", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    await pushPdfDocumentViewerRouteSafely(
      router,
      "/pdf-viewer?sessionId=session-ios&openToken=" as Parameters<typeof pushPdfDocumentViewerRouteSafely>[1],
    );

    expect(mockRootRouterPush).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-ios&openToken=");
    expect(mockRootRouterReplace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("dismisses modal, waits for interactions, then delays Android navigation by one frame", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    const order: string[] = [];
    mockRunAfterInteractions.mockImplementation((callback: () => void) => {
      order.push("interactions");
      callback();
      return { cancel: jest.fn() };
    });
    mockRootRouterReplace.mockImplementation(() => {
      order.push("replace");
    });
    jest.spyOn(global, "setTimeout").mockImplementation(((callback: () => void) => {
      order.push("timer");
      callback();
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    await pushPdfDocumentViewerRouteSafely(
      router,
      "/pdf-viewer?sessionId=session-android&openToken=" as Parameters<typeof pushPdfDocumentViewerRouteSafely>[1],
      () => {
        order.push("before");
      },
    );

    expect(order).toEqual(["before", "interactions", "timer", "replace"]);
    expect(mockRootRouterReplace).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-android&openToken=");
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("keeps viewer navigation alive when modal dismiss callback fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    await pushPdfDocumentViewerRouteSafely(
      router,
      "/pdf-viewer?sessionId=session-dismiss-error&openToken=" as Parameters<
        typeof pushPdfDocumentViewerRouteSafely
      >[1],
      () => {
        throw new Error("dismiss failed");
      },
    );

    expect(mockRunAfterInteractions).toHaveBeenCalledTimes(1);
    expect(mockRootRouterPush).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-dismiss-error&openToken=");
    expect(mockRootRouterReplace).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
