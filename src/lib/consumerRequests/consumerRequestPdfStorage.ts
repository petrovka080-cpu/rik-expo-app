import { PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS } from "../security/securityPrivacyHardening";

type ConsumerRepairPdfStorageObject = {
  storageBucket: string;
  storageKey: string;
  body: string;
  contentType: "application/pdf";
  uploadedAt: string;
};

const pdfStorage = new Map<string, ConsumerRepairPdfStorageObject>();

function storageId(storageBucket: string, storageKey: string): string {
  return `${storageBucket}/${storageKey}`;
}

export function uploadConsumerRepairPdfObject(input: {
  storageBucket: string;
  storageKey: string;
  body: string;
  contentType: "application/pdf";
}): ConsumerRepairPdfStorageObject {
  if (input.contentType !== "application/pdf") {
    throw new Error("Consumer repair PDF upload must use application/pdf.");
  }
  if (!input.body.startsWith("%PDF-")) {
    throw new Error("Consumer repair PDF upload failed: invalid PDF bytes.");
  }

  const object: ConsumerRepairPdfStorageObject = {
    storageBucket: input.storageBucket,
    storageKey: input.storageKey,
    body: input.body,
    contentType: input.contentType,
    uploadedAt: new Date().toISOString(),
  };
  pdfStorage.set(storageId(input.storageBucket, input.storageKey), object);
  return { ...object };
}

export function consumerRepairPdfStorageObjectExists(storageBucket: string, storageKey: string): boolean {
  return pdfStorage.has(storageId(storageBucket, storageKey));
}

export function createConsumerRepairPdfSignedUrl(input: {
  storageBucket: string;
  storageKey: string;
  expiresInSeconds?: number;
}): { signedUrl: string; expiresAt: string; contentType: "application/pdf" } {
  const object = pdfStorage.get(storageId(input.storageBucket, input.storageKey));
  if (!object) throw new Error("Consumer repair PDF storage object is missing.");

  const expiresAt = new Date(
    Date.now() + (input.expiresInSeconds ?? PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS) * 1000,
  ).toISOString();
  return {
    signedUrl: `data:application/pdf;base64,${stringToBase64(object.body)}`,
    expiresAt,
    contentType: object.contentType,
  };
}

function stringToBase64(value: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < value.length; index += 3) {
    const a = value.charCodeAt(index) & 255;
    const b = index + 1 < value.length ? value.charCodeAt(index + 1) & 255 : 0;
    const c = index + 2 < value.length ? value.charCodeAt(index + 2) & 255 : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += index + 1 < value.length ? alphabet[(triplet >> 6) & 63] : "=";
    output += index + 2 < value.length ? alphabet[triplet & 63] : "=";
  }
  return output;
}

export function getConsumerRepairPdfStorageObject(input: {
  storageBucket: string;
  storageKey: string;
}): ConsumerRepairPdfStorageObject | null {
  const object = pdfStorage.get(storageId(input.storageBucket, input.storageKey));
  return object ? { ...object } : null;
}

export function __deleteConsumerRepairPdfStorageObjectForTests(input: {
  storageBucket: string;
  storageKey: string;
}): void {
  pdfStorage.delete(storageId(input.storageBucket, input.storageKey));
}

export function __resetConsumerRepairPdfStorageForTests(): void {
  pdfStorage.clear();
}
