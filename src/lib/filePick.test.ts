/* eslint-disable import/first */
const mockAlert = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockReportAndSwallow = jest.fn();

jest.mock("react-native", () => ({
  Alert: {
    alert: (...args: unknown[]) => mockAlert(...args),
  },
  Platform: {
    OS: "android",
  },
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock("./observability/catchDiscipline", () => ({
  reportAndSwallow: (...args: unknown[]) => mockReportAndSwallow(...args),
}));

import { normalizeNativePickedFile, pickFileAny } from "./filePick";

describe("filePick", () => {
  const runtime = globalThis as typeof globalThis & { document?: Document };
  const reactNative = jest.requireMock("react-native") as { Platform: { OS: string } };

  beforeEach(() => {
    mockAlert.mockReset();
    mockGetDocumentAsync.mockReset();
    mockReportAndSwallow.mockReset();
    reactNative.Platform.OS = "android";
    delete runtime.document;
  });

  it("surfaces a controlled alert and observability when native picking fails", async () => {
    mockGetDocumentAsync.mockRejectedValueOnce(new Error("picker blocked"));

    await expect(pickFileAny()).resolves.toBeNull();

    expect(mockAlert).toHaveBeenCalledWith(
      "Файл",
      expect.stringMatching(/\S/),
    );
    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "file_pick",
        event: "file_pick_failed",
        scope: "filePick.pick_file_any",
      }),
    );
  });

  it("records cleanup-only observability if web input removal fails", async () => {
    reactNative.Platform.OS = "web";
    const input = {
      type: "",
      accept: "",
      files: [{ name: "doc.pdf" }] as File[] | null,
      onchange: null as null | (() => void),
      click: jest.fn(() => {
        input.onchange?.();
      }),
      remove: jest.fn(() => {
        throw new Error("remove blocked");
      }),
    };
    runtime.document = {
      createElement: jest.fn(() => input),
    } as unknown as Document;

    const picked = await pickFileAny({ accept: ".pdf" });

    expect(picked).toEqual({ name: "doc.pdf" });
    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "file_pick",
        event: "file_pick_input_cleanup_failed",
        scope: "filePick.web_input_cleanup",
      }),
    );
  });

  it("normalizes first nested asset safely", () => {
    expect(
      normalizeNativePickedFile({
        assets: [
          {
            name: "offer.pdf",
            uri: "file:///tmp/offer.pdf",
            size: 42,
          },
        ],
      }),
    ).toEqual({
      name: "offer.pdf",
      uri: "file:///tmp/offer.pdf",
      fileCopyUri: null,
      mimeType: null,
      type: null,
      size: 42,
    });
  });
});
