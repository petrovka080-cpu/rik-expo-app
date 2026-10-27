import { createPdfDocumentViewerHref } from "./pdfDocumentViewerEntry";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../logger", () => ({ logger: { info: jest.fn() } }));

describe("viewer entry navigation identity", () => {
  it("encodes the actual caller key separately from the safe recovery href", () => {
    const result = createPdfDocumentViewerHref("own-session", "own-token", "/request?draftId=own", "request/index-+/own");
    const query = new URLSearchParams(String(result.href).split("?")[1]);
    expect(query.get("callerRouteKey")).toBe("request/index-+/own");
    expect(query.get("returnTo")).toBe("/request?draftId=own");
    expect(query.get("sessionId")).toBe("own-session");
  });

  it("does not admit an external recovery route with an otherwise valid caller key", () => {
    const result = createPdfDocumentViewerHref("own-session", null, "https://example.com", "own-caller");
    expect(new URLSearchParams(String(result.href).split("?")[1]).has("returnTo")).toBe(false);
  });
});
