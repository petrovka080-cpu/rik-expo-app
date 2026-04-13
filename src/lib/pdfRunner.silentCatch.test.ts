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

import { clearPdfRunnerSessionState, runPdfTop } from "./pdfRunner";
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

  it("clears the active run guard on session boundary reset", async () => {
    const runtime = globalThis as typeof globalThis & { window?: any };
    const firstUrl = createDeferred<string>();
    const secondUrl = createDeferred<string>();
    const open = jest.fn(() => ({
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
      },
      location: {
        replace: jest.fn(),
        href: "",
      },
      focus: jest.fn(),
      close: jest.fn(),
    }));
    runtime.window = { open };

    const baseArgs = {
      supabase: {
        auth: {
          getSession: jest.fn(),
        },
      } as never,
      key: "pdf:test:session-reset",
      label: "Opening PDF",
      mode: "preview" as const,
      fileName: "proposal.pdf",
    };

    const firstRun = runPdfTop({
      ...baseArgs,
      getRemoteUrl: () => firstUrl.promise,
    });
    await Promise.resolve();

    await runPdfTop({
      ...baseArgs,
      getRemoteUrl: () => "https://example.com/skipped.pdf",
    });
    expect(open).toHaveBeenCalledTimes(1);

    clearPdfRunnerSessionState();

    const secondRun = runPdfTop({
      ...baseArgs,
      getRemoteUrl: () => secondUrl.promise,
    });
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(2);

    firstUrl.resolve("https://example.com/first.pdf");
    secondUrl.resolve("https://example.com/second.pdf");

    await expect(Promise.all([firstRun, secondRun])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
