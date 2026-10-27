import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";

import {
  getLatestProposalAttachmentPreview,
  isPdfLike,
} from "../../lib/files";
import { createPdfDocumentDescriptor, type DocumentDescriptor } from "../../lib/documents/pdfDocument";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  buildAccountantAttachmentPdfManifestContract,
  type AccountantAttachmentPdfManifestContract,
} from "./accountantAttachmentPdf.shared";

const ACCOUNTANT_ATTACHMENT_PDF_CACHE_TTL_MS = 9 * 60 * 1000;
const ACCOUNTANT_ATTACHMENT_PDF_CACHE_MAX = 30;

type AccountantAttachmentPdfCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  manifest: AccountantAttachmentPdfManifestContract;
};

type AccountantAttachmentPdfStoredCacheEntry = {
  version: 1;
  manifest: AccountantAttachmentPdfManifestContract;
  descriptor: DocumentDescriptor;
};

export type AccountantAttachmentPreviewResult =
  | {
      kind: "pdf";
      descriptor: DocumentDescriptor;
      manifest: AccountantAttachmentPdfManifestContract;
    }
  | {
      kind: "file";
      url: string;
      fileName: string;
    };

export type ResolveAccountantAttachmentPreviewArgs = {
  proposalId: string | number;
  groupKey: "proposal_pdf" | "invoice" | "payment" | string;
  title: string;
};

const accountantAttachmentPdfCache =
  new Map<string, AccountantAttachmentPdfCacheEntry>();
const accountantAttachmentPdfInFlight =
  new Map<string, Promise<AccountantAttachmentPreviewResult>>();

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

function hashAccountantAttachmentCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeProposalId(value: string | number) {
  const proposalId = String(value ?? "").trim();
  if (!proposalId) throw new Error("accountant attachment PDF proposalId is required");
  return proposalId;
}

function normalizeGroupKey(value: string) {
  const groupKey = String(value ?? "").trim();
  if (!groupKey) throw new Error("accountant attachment PDF groupKey is required");
  return groupKey;
}

function buildAccountantAttachmentScopeKey(proposalId: string, groupKey: string) {
  return `acc_attachment_pdf:${proposalId}:${groupKey}`;
}

function buildAccountantAttachmentStoredCacheKey(proposalId: string, groupKey: string) {
  return `pdf.acc.attachment.v1.${hashAccountantAttachmentCacheKey(`${proposalId}:${groupKey}`)}`;
}

function isAccountantAttachmentStoredCacheEntry(
  value: unknown,
): value is AccountantAttachmentPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccountantAttachmentPdfStoredCacheEntry>;
  return record.version === 1 &&
    Boolean(record.manifest) &&
    typeof record.manifest === "object" &&
    Boolean(record.descriptor) &&
    typeof record.descriptor === "object";
}

function recordAttachmentPdfReady(args: {
  proposalId: string;
  groupKey: string;
  startedAt: number;
  result: "success" | "cache_hit" | "joined_inflight";
  cacheLayer: "memory" | "storage" | "lookup" | "inflight";
  manifest?: AccountantAttachmentPdfManifestContract | null;
}) {
  recordPlatformObservability({
    screen: "accountant",
    surface: "accountant_attachment_pdf",
    category: "fetch",
    event: "accountant_attachment_pdf_ready",
    result: args.result,
    durationMs: Math.max(0, Math.round(nowMs() - args.startedAt)),
    sourceKind: "pdf:attachment",
    cacheLayer: args.cacheLayer,
    extra: {
      proposalId: args.proposalId,
      groupKey: args.groupKey,
      documentKind: args.manifest?.documentKind ?? "accountant_attachment_pdf",
      sourceVersion: args.manifest?.sourceVersion ?? null,
      artifactVersion: args.manifest?.artifactVersion ?? null,
      cacheStatus: args.cacheLayer,
    },
  });
}

function getAccountantAttachmentPdfCache(
  key: string,
): AccountantAttachmentPdfCacheEntry | null {
  const hit = accountantAttachmentPdfCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= ACCOUNTANT_ATTACHMENT_PDF_CACHE_TTL_MS) {
    accountantAttachmentPdfCache.delete(key);
    return null;
  }
  accountantAttachmentPdfCache.delete(key);
  accountantAttachmentPdfCache.set(key, hit);
  return hit;
}

function setAccountantAttachmentPdfCache(
  key: string,
  descriptor: DocumentDescriptor,
  manifest: AccountantAttachmentPdfManifestContract,
) {
  if (accountantAttachmentPdfCache.has(key)) {
    accountantAttachmentPdfCache.delete(key);
  }
  accountantAttachmentPdfCache.set(key, {
    ts: Date.now(),
    descriptor,
    manifest,
  });
  while (accountantAttachmentPdfCache.size > ACCOUNTANT_ATTACHMENT_PDF_CACHE_MAX) {
    const oldestKey = accountantAttachmentPdfCache.keys().next().value;
    if (!oldestKey) break;
    accountantAttachmentPdfCache.delete(oldestKey);
  }
}

async function canReuseDescriptor(descriptor: DocumentDescriptor): Promise<boolean> {
  let sourceUri = "";
  try {
    sourceUri = descriptor.fileSource.uri;
    if (descriptor.fileSource.kind === "remote-url") return true;
    if (descriptor.fileSource.kind === "blob") return Platform.OS === "web";
    const info = await FileSystemModule.getInfoAsync(descriptor.fileSource.uri);
    return Boolean(info?.exists);
  } catch (error) {
    if (__DEV__) {
      console.warn("[accountant-attachment-pdf] reuse_probe_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        uri: sourceUri,
      });
    }
    return false;
  }
}

async function readAccountantAttachmentPdfStoredCache(
  proposalId: string,
  groupKey: string,
): Promise<AccountantAttachmentPdfCacheEntry | null> {
  const cacheKey = buildAccountantAttachmentStoredCacheKey(proposalId, groupKey);
  const stored = await readStoredJson<AccountantAttachmentPdfStoredCacheEntry>({
    screen: "accountant",
    surface: "accountant_attachment_pdf",
    key: cacheKey,
  });
  if (!isAccountantAttachmentStoredCacheEntry(stored)) return null;
  if (
    stored.manifest.status !== "ready" ||
    stored.manifest.documentScope.proposalId !== proposalId ||
    stored.manifest.documentScope.groupKey !== groupKey ||
    !(await canReuseDescriptor(stored.descriptor))
  ) {
    await removeStoredValue({
      screen: "accountant",
      surface: "accountant_attachment_pdf",
      key: cacheKey,
    });
    return null;
  }
  return {
    ts: Date.now(),
    descriptor: stored.descriptor,
    manifest: stored.manifest,
  };
}

async function writeAccountantAttachmentPdfStoredCache(
  proposalId: string,
  groupKey: string,
  manifest: AccountantAttachmentPdfManifestContract,
  descriptor: DocumentDescriptor,
) {
  await writeStoredJson<AccountantAttachmentPdfStoredCacheEntry>(
    {
      screen: "accountant",
      surface: "accountant_attachment_pdf",
      key: buildAccountantAttachmentStoredCacheKey(proposalId, groupKey),
      ttlMs: ACCOUNTANT_ATTACHMENT_PDF_CACHE_TTL_MS,
    },
    {
      version: 1,
      manifest,
      descriptor,
    },
  );
}

export async function resolveAccountantAttachmentPreview(
  args: ResolveAccountantAttachmentPreviewArgs,
): Promise<AccountantAttachmentPreviewResult> {
  const startedAt = nowMs();
  const proposalId = normalizeProposalId(args.proposalId);
  const groupKey = normalizeGroupKey(args.groupKey);
  const scopeKey = buildAccountantAttachmentScopeKey(proposalId, groupKey);
  const alreadyInFlight = accountantAttachmentPdfInFlight.get(scopeKey);
  if (alreadyInFlight) {
    const result = await alreadyInFlight;
    recordAttachmentPdfReady({
      proposalId,
      groupKey,
      startedAt,
      result: "joined_inflight",
      cacheLayer: "inflight",
      manifest: result.kind === "pdf" ? result.manifest : null,
    });
    return result;
  }

  let task: Promise<AccountantAttachmentPreviewResult>;
  task = Promise.resolve().then(async (): Promise<AccountantAttachmentPreviewResult> => {
    const cached = getAccountantAttachmentPdfCache(scopeKey);
    if (cached) {
      if (await canReuseDescriptor(cached.descriptor)) {
        recordAttachmentPdfReady({
          proposalId,
          groupKey,
          startedAt,
          result: "cache_hit",
          cacheLayer: "memory",
          manifest: cached.manifest,
        });
        return {
          kind: "pdf",
          descriptor: cached.descriptor,
          manifest: cached.manifest,
        };
      }
      accountantAttachmentPdfCache.delete(scopeKey);
    }

    const stored = await readAccountantAttachmentPdfStoredCache(proposalId, groupKey);
    if (stored) {
      setAccountantAttachmentPdfCache(scopeKey, stored.descriptor, stored.manifest);
      recordAttachmentPdfReady({
        proposalId,
        groupKey,
        startedAt,
        result: "cache_hit",
        cacheLayer: "storage",
        manifest: stored.manifest,
      });
      return {
        kind: "pdf",
        descriptor: stored.descriptor,
        manifest: stored.manifest,
      };
    }

    const preview = await getLatestProposalAttachmentPreview(proposalId, groupKey);
    if (!isPdfLike(preview.fileName, preview.url)) {
      recordAttachmentPdfReady({
        proposalId,
        groupKey,
        startedAt,
        result: "success",
        cacheLayer: "lookup",
      });
      return {
        kind: "file",
        url: preview.url,
        fileName: preview.fileName,
      };
    }

    const row = preview.row;
    const manifest = buildAccountantAttachmentPdfManifestContract({
      proposalId,
      groupKey,
      attachmentId: row.id,
      fileName: preview.fileName,
      url: preview.url,
      bucketId: row.bucket_id,
      storagePath: row.storage_path,
      createdAt: row.created_at,
    });
    const descriptor = createPdfDocumentDescriptor({
      uri: preview.url,
      title: args.title,
      fileName: preview.fileName,
      documentType: "attachment_pdf",
      source: "attachment",
      originModule: "accountant",
      entityId: proposalId,
    });
    setAccountantAttachmentPdfCache(scopeKey, descriptor, manifest);
    await writeAccountantAttachmentPdfStoredCache(proposalId, groupKey, manifest, descriptor);
    recordAttachmentPdfReady({
      proposalId,
      groupKey,
      startedAt,
      result: "success",
      cacheLayer: "lookup",
      manifest,
    });
    return {
      kind: "pdf",
      descriptor,
      manifest,
    };
  }).finally(() => {
    if (accountantAttachmentPdfInFlight.get(scopeKey) === task) {
      accountantAttachmentPdfInFlight.delete(scopeKey);
    }
  });
  accountantAttachmentPdfInFlight.set(scopeKey, task);
  return await task;
}

export function clearAccountantAttachmentPdfPreviewCacheForTests() {
  accountantAttachmentPdfCache.clear();
  accountantAttachmentPdfInFlight.clear();
}
