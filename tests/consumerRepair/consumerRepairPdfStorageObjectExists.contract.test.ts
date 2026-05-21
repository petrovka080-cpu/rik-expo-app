import {
  __resetConsumerRepairRequestStoreForTests,
  consumerRepairPdfStorageObjectExists,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair PDF storage contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("uploads and verifies the storage object before exposing the PDF row", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const pdf = bundle.pdfs[0];
    const object = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });

    expect(consumerRepairPdfStorageObjectExists(pdf.storageBucket, pdf.storageKey)).toBe(true);
    expect(object?.contentType).toBe("application/pdf");
    expect(pdf.pdfStatus).toBe("generated");
    expect(Date.parse(pdf.storageVerifiedAt)).toBeGreaterThanOrEqual(Date.parse(pdf.uploadedAt));
  });
});
