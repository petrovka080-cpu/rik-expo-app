const mockAlert = jest.fn();
const mockOpenUrl = jest.fn();

jest.mock("./supabaseClient", () => ({
  SUPABASE_ANON_KEY: "anon",
}));

jest.mock("react-native", () => {
  return {
    Alert: {
      alert: (...args: unknown[]) => mockAlert(...args),
    },
    Linking: {
      openURL: (...args: unknown[]) => mockOpenUrl(...args),
    },
    Platform: {
      OS: "web",
    },
  };
});

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
  downloadAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

jest.mock("./fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "/tmp/",
    documentDir: "/tmp/",
    legacyDocumentDirectory: "/tmp/",
  })),
}));

import { runPdfTop } from "./pdfRunner";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./observability/platformObservability";

describe("runPdfTop", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean; window?: unknown };
    runtime.__DEV__ = false;
    runtime.window = {
      open: jest.fn(() => null),
    } as never;
    resetPlatformObservabilityEvents();
    mockAlert.mockReset();
    mockOpenUrl.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not fail silently when popup open is blocked on web", async () => {
    await runPdfTop({
      supabase: {
        auth: {
          getSession: jest.fn(),
        },
      } as never,
      key: "pdf:test:popup-blocked",
      label: "Открываю PDF",
      mode: "preview",
      fileName: "proposal.pdf",
      getRemoteUrl: () => "https://example.com/proposal.pdf",
    });

    expect(mockAlert).toHaveBeenCalled();
    expect(getPlatformObservabilityEvents().some((event) => event.event === "pdf_popup_blocked")).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "preview_pdf" && event.result === "error",
      ),
    ).toBe(true);
  });
});
