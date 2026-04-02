import { decode as decodeBase64 } from "base64-arraybuffer";

type FileInfoLike = {
  exists?: unknown;
  size?: unknown;
};

export type PdfValidationFileSystemLike = {
  getInfoAsync?: (uri: string) => Promise<FileInfoLike | null | undefined>;
  readAsStringAsync?: (
    uri: string,
    options: { encoding: "base64"; position?: number; length?: number },
  ) => Promise<string>;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get?: (name: string) => string | null };
  arrayBuffer?: () => Promise<ArrayBuffer>;
}>;

const PDF_MAGIC_PREFIX = "%pdf-";
const HTML_PREFIXES = ["<!doctype", "<html", "<?xml", "<head", "<body"];

function getFileSizeBytes(info: FileInfoLike | null | undefined) {
  const size = Number(info?.size);
  return Number.isFinite(size) ? size : undefined;
}

function decodeAsciiPrefix(base64: string) {
  const value = String(base64 || "").trim();
  if (!value) return "";
  try {
    const bytes = new Uint8Array(decodeBase64(value));
    return Array.from(bytes)
      .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : " "))
      .join("")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function bytesToAsciiPrefix(bytes: Uint8Array) {
  return Array.from(bytes.slice(0, 24))
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : " "))
    .join("")
    .trim()
    .toLowerCase();
}

function isHtmlLikePrefix(prefix: string) {
  const normalized = prefix.trim().toLowerCase();
  return HTML_PREFIXES.some((candidate) => normalized.startsWith(candidate));
}

function isPdfMagicPrefix(prefix: string) {
  return prefix.trim().toLowerCase().startsWith(PDF_MAGIC_PREFIX);
}

export async function assertValidLocalPdfFile(args: {
  fileSystem: PdfValidationFileSystemLike;
  uri: string;
  failureLabel?: string;
}) {
  const failureLabel = args.failureLabel || "PDF file";
  if (!args.fileSystem.getInfoAsync) {
    throw new Error(`${failureLabel} storage is unavailable.`);
  }

  const info = await args.fileSystem.getInfoAsync(args.uri);
  if (!info?.exists) {
    throw new Error(`${failureLabel} is missing.`);
  }

  const sizeBytes = getFileSizeBytes(info);
  if (!sizeBytes || sizeBytes <= 0) {
    throw new Error(`${failureLabel} is empty.`);
  }

  if (!args.fileSystem.readAsStringAsync) {
    return {
      sizeBytes,
      headerAscii: "",
    };
  }

  const base64 = await args.fileSystem.readAsStringAsync(args.uri, {
    encoding: "base64",
    position: 0,
    length: 24,
  });
  const headerAscii = decodeAsciiPrefix(base64);

  if (!headerAscii) {
    throw new Error(`${failureLabel} header could not be read.`);
  }
  if (isHtmlLikePrefix(headerAscii)) {
    throw new Error(`${failureLabel} contains HTML instead of PDF.`);
  }
  if (!isPdfMagicPrefix(headerAscii)) {
    throw new Error(`${failureLabel} is not a valid PDF.`);
  }

  return {
    sizeBytes,
    headerAscii,
  };
}

export async function assertValidRemotePdfResponse(args: {
  uri: string;
  fetchImpl?: FetchLike;
  failureLabel?: string;
}) {
  const failureLabel = args.failureLabel || "PDF response";
  const fetchImpl = args.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!fetchImpl) {
    throw new Error(`${failureLabel} fetch is unavailable.`);
  }

  const acceptHeaders = { Accept: "application/pdf" };
  try {
    const headResponse = await fetchImpl(args.uri, {
      method: "HEAD",
      headers: acceptHeaders,
    });
    const contentType = String(headResponse.headers?.get?.("content-type") || "").toLowerCase();
    if (headResponse.ok && contentType.includes("application/pdf")) {
      return {
        contentType,
      };
    }
    if (contentType.includes("text/html")) {
      throw new Error(`${failureLabel} returned HTML instead of PDF.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("returned HTML")) {
      throw error;
    }
  }

  const response = await fetchImpl(args.uri, {
    method: "GET",
    headers: {
      ...acceptHeaders,
      Range: "bytes=0-31",
    },
  });

  if (!response.ok) {
    throw new Error(`${failureLabel} request failed (${response.status}).`);
  }

  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    throw new Error(`${failureLabel} returned HTML instead of PDF.`);
  }

  const bytes = new Uint8Array((await response.arrayBuffer?.()) || new ArrayBuffer(0));
  if (bytes.length <= 0) {
    throw new Error(`${failureLabel} is empty.`);
  }

  const headerAscii = bytesToAsciiPrefix(bytes);
  if (isHtmlLikePrefix(headerAscii)) {
    throw new Error(`${failureLabel} returned HTML instead of PDF.`);
  }
  if (!isPdfMagicPrefix(headerAscii)) {
    throw new Error(`${failureLabel} is not a valid PDF.`);
  }

  return {
    contentType,
    headerAscii,
  };
}
