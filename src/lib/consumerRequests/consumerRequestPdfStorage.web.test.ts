import {
  __deleteConsumerRepairPdfStorageObjectForTests,
  __resetConsumerRepairPdfStorageForTests,
  createConsumerRepairPdfSignedUrl,
  uploadConsumerRepairPdfObject,
} from "./consumerRequestPdfStorage";

describe("consumer repair PDF web object URL cache", () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:https://app.local/consumer-request-pdf"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    __resetConsumerRepairPdfStorageForTests();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  });

  it("prewarms one stable blob URL and releases it with its storage object", () => {
    uploadConsumerRepairPdfObject({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
      body: "%PDF-1.4\n%%EOF",
      contentType: "application/pdf",
    });

    const first = createConsumerRepairPdfSignedUrl({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
    });
    const second = createConsumerRepairPdfSignedUrl({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
    });

    expect(first.signedUrl).toBe("blob:https://app.local/consumer-request-pdf");
    expect(second.signedUrl).toBe(first.signedUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    __deleteConsumerRepairPdfStorageObjectForTests({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first.signedUrl);
  });
});
