import { Platform } from "react-native";
import { Blob } from "node:buffer";
import { downloadPdfAsset } from "./pdfViewer.helpers";
import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { fetchWithRequestTimeout } from "../requestTimeoutPolicy";
import { clearAllByOwner } from "../lifecycle/timerRegistry";

jest.mock("../requestTimeoutPolicy", () => ({ fetchWithRequestTimeout: jest.fn() }));
jest.mock("../documents/pdfDocumentActions", () => ({ sharePdfDocument: jest.fn(), openPdfDocumentExternal: jest.fn() }));

const fetchPdf = jest.mocked(fetchWithRequestTimeout);
const descriptor = (uri: string): DocumentAsset => ({ uri, title: "Смета", fileName: "estimate.pdf" } as DocumentAsset);
const savedDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const savedCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const savedRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
let anchor: { href: string; download: string; rel: string; click: jest.Mock; remove: jest.Mock };
let create: jest.Mock;
let revoke: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(Platform, "OS", "web");
  anchor = { href: "", download: "", rel: "", click: jest.fn(), remove: jest.fn() };
  Object.defineProperty(globalThis, "document", { configurable: true,
    value: { createElement: jest.fn(() => anchor), body: { appendChild: jest.fn() } } });
  create = jest.fn(() => "blob:local-download");
  revoke = jest.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  fetchPdf.mockReset();
});

afterEach(() => {
  clearAllByOwner("pdf-viewer:web-download-url-revoke");
  for (const [target, key, previous] of [[globalThis, "document", savedDocument],
    [URL, "createObjectURL", savedCreate], [URL, "revokeObjectURL", savedRevoke]] as const) {
    if (previous) Object.defineProperty(target, key, previous);
    else Reflect.deleteProperty(target, key);
  }
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function response(content: string, status = 200) {
  return new Response(content, { status, headers: { "Content-Type": "application/pdf" } });
}

it("downloads cross-origin PDF bytes through a local URL, preserving the viewer and the file name", async () => {
  const asset = descriptor("https://files.example.test/estimate.pdf?signature=short-lived");
  fetchPdf.mockResolvedValue(response("%PDF-1.7\naccepted artifact"));
  await downloadPdfAsset(asset);
  expect(fetchPdf).toHaveBeenCalledWith(asset.uri, { headers: { Accept: "application/pdf" } },
    expect.objectContaining({ requestClass: "heavy_report_or_pdf_or_storage" }));
  expect(create).toHaveBeenCalledTimes(1);
  expect(await (create.mock.calls[0][0] as Blob).text()).toBe("%PDF-1.7\naccepted artifact");
  expect(anchor.href).toBe("blob:local-download");
  expect(anchor.href).not.toBe(asset.uri);
  expect(anchor.download).toBe("estimate.pdf");
  expect(anchor.click).toHaveBeenCalledTimes(1);
  expect(anchor.remove).toHaveBeenCalledTimes(1);
  expect(revoke).not.toHaveBeenCalled();
  jest.advanceTimersByTime(60_000);
  expect(revoke).toHaveBeenCalledWith("blob:local-download");
  expect(asset.uri).toBe("https://files.example.test/estimate.pdf?signature=short-lived");
});

it("borrows a document-session blob without fetching or revoking its preview URL", async () => {
  await downloadPdfAsset(descriptor("blob:document-session-preview"));
  expect(anchor.href).toBe("blob:document-session-preview");
  expect(anchor.click).toHaveBeenCalledTimes(1);
  expect(fetchPdf).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  jest.advanceTimersByTime(60_000);
  expect(revoke).not.toHaveBeenCalled();
});

it.each(["", "<html>expired signature</html>", "not a PDF"])("rejects invalid downloaded bytes before any navigation or download: %s", async content => {
  fetchPdf.mockResolvedValue(response(content));
  await expect(downloadPdfAsset(descriptor("https://files.example.test/artifact"))).rejects.toThrow("invalid document");
  expect(anchor.click).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it("keeps the viewer on an HTTP failure and releases temporary bytes if clicking fails", async () => {
  fetchPdf.mockResolvedValueOnce(response("%PDF-", 403));
  await expect(downloadPdfAsset(descriptor("https://files.example.test/expired"))).rejects.toThrow("403");
  expect(anchor.click).not.toHaveBeenCalled();
  fetchPdf.mockResolvedValueOnce(response("%PDF-1.7\nvalid"));
  anchor.click.mockImplementationOnce(() => { throw new Error("download unavailable"); });
  await expect(downloadPdfAsset(descriptor("https://files.example.test/valid"))).rejects.toThrow("download unavailable");
  expect(anchor.remove).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(60_000);
  expect(revoke).toHaveBeenCalledWith("blob:local-download");
});
