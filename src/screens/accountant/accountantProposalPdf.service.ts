import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";

import { buildProposalPdfHtml } from "../../lib/api/pdf_proposal";
import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import {
  buildGeneratedPdfDescriptor,
  renderPdfHtmlToSource,
} from "../../lib/pdf/pdf.runner";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { PdfSource } from "../../lib/pdfFileContract";
import {
  buildAccountantProposalPdfManifestContract,
  type AccountantProposalPdfManifestContract,
} from "./accountantProposalPdf.shared";

const ACCOUNTANT_PROPOSAL_PDF_CACHE_TTL_MS = 30 * 60 * 1000;
const ACCOUNTANT_PROPOSAL_PDF_CACHE_MAX = 20;

type AccountantProposalPdfCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  manifest: AccountantProposalPdfManifestContract;
};

type AccountantProposalPdfStoredCacheEntry = {
  version: 1;
  manifest: AccountantProposalPdfManifestContract;
  descriptor: DocumentDescriptor;
};

export type GenerateAccountantProposalPdfDocumentArgs = {
  proposalId: string | number;
  title?: string | null;
  fileName?: string | null;
};

const accountantProposalPdfCache =
  new Map<string, AccountantProposalPdfCacheEntry>();
const accountantProposalPdfInFlight =
  new Map<string, Promise<DocumentDescriptor>>();

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

function hashAccountantProposalPdfCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeProposalId(value: string | number) {
  const proposalId = String(value ?? "").trim();
  if (!proposalId) throw new Error("accountant proposal PDF proposalId is required");
  return proposalId;
}

function buildAccountantProposalScopeKey(proposalId: string) {
  return `acc_proposal_pdf:${proposalId}`;
}

function buildAccountantProposalStoredCacheKey(proposalId: string) {
  return `pdf.acc.proposal.v1.${hashAccountantProposalPdfCacheKey(proposalId)}`;
}

function isAccountantProposalStoredCacheEntry(
  value: unknown,
): value is AccountantProposalPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccountantProposalPdfStoredCacheEntry>;
  return record.version === 1 &&
    Boolean(record.manifest) &&
    typeof record.manifest === "object" &&
    Boolean(record.descriptor) &&
    typeof record.descriptor === "object";
}

function recordProposalPdfReady(args: {
  proposalId: string;
  startedAt: number;
  result: "success" | "cache_hit" | "joined_inflight";
  cacheLayer: "memory" | "storage" | "rebuild" | "inflight";
  manifest?: AccountantProposalPdfManifestContract | null;
}) {
  recordPlatformObservability({
    screen: "accountant",
    surface: "accountant_proposal_pdf",
    category: "fetch",
    event: "accountant_proposal_pdf_ready",
    result: args.result,
    durationMs: Math.max(0, Math.round(nowMs() - args.startedAt)),
    sourceKind: "pdf:proposal",
    cacheLayer: args.cacheLayer,
    extra: {
      proposalId: args.proposalId,
      documentKind: args.manifest?.documentKind ?? "accountant_proposal_pdf",
      sourceVersion: args.manifest?.sourceVersion ?? null,
      artifactVersion: args.manifest?.artifactVersion ?? null,
      cacheStatus: args.cacheLayer,
    },
  });
}

function getAccountantProposalPdfCache(
  key: string,
): AccountantProposalPdfCacheEntry | null {
  const hit = accountantProposalPdfCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= ACCOUNTANT_PROPOSAL_PDF_CACHE_TTL_MS) {
    accountantProposalPdfCache.delete(key);
    return null;
  }
  accountantProposalPdfCache.delete(key);
  accountantProposalPdfCache.set(key, hit);
  return hit;
}

function setAccountantProposalPdfCache(
  key: string,
  descriptor: DocumentDescriptor,
  manifest: AccountantProposalPdfManifestContract,
) {
  if (accountantProposalPdfCache.has(key)) {
    accountantProposalPdfCache.delete(key);
  }
  accountantProposalPdfCache.set(key, {
    ts: Date.now(),
    descriptor,
    manifest,
  });
  while (accountantProposalPdfCache.size > ACCOUNTANT_PROPOSAL_PDF_CACHE_MAX) {
    const oldestKey = accountantProposalPdfCache.keys().next().value;
    if (!oldestKey) break;
    accountantProposalPdfCache.delete(oldestKey);
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
      console.warn("[accountant-proposal-pdf] reuse_probe_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        uri: sourceUri,
      });
    }
    return false;
  }
}

async function readAccountantProposalPdfStoredCache(
  proposalId: string,
): Promise<AccountantProposalPdfCacheEntry | null> {
  const cacheKey = buildAccountantProposalStoredCacheKey(proposalId);
  const stored = await readStoredJson<AccountantProposalPdfStoredCacheEntry>({
    screen: "accountant",
    surface: "accountant_proposal_pdf",
    key: cacheKey,
  });
  if (!isAccountantProposalStoredCacheEntry(stored)) return null;
  if (
    stored.manifest.status !== "ready" ||
    stored.manifest.documentScope.proposalId !== proposalId ||
    !(await canReuseDescriptor(stored.descriptor))
  ) {
    await removeStoredValue({
      screen: "accountant",
      surface: "accountant_proposal_pdf",
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

async function writeAccountantProposalPdfStoredCache(
  proposalId: string,
  manifest: AccountantProposalPdfManifestContract,
  descriptor: DocumentDescriptor,
) {
  if (descriptor.fileSource.kind === "blob") return;
  await writeStoredJson<AccountantProposalPdfStoredCacheEntry>(
    {
      screen: "accountant",
      surface: "accountant_proposal_pdf",
      key: buildAccountantProposalStoredCacheKey(proposalId),
      ttlMs: ACCOUNTANT_PROPOSAL_PDF_CACHE_TTL_MS,
    },
    {
      version: 1,
      manifest,
      descriptor,
    },
  );
}

async function renderProposalDescriptor(args: {
  proposalId: string;
  html: string;
  title?: string | null;
  fileName?: string | null;
}): Promise<DocumentDescriptor> {
  return buildGeneratedPdfDescriptor({
    getSource: (): Promise<PdfSource> =>
      renderPdfHtmlToSource({
        html: args.html,
        documentType: "proposal",
        source: "accountant",
        maxLength: 500_000,
      }),
    title: args.title || `Proposal ${args.proposalId}`,
    fileName: args.fileName,
    documentType: "proposal",
    originModule: "accountant",
    entityId: args.proposalId,
  });
}

export async function generateAccountantProposalPdfDocument(
  args: GenerateAccountantProposalPdfDocumentArgs,
): Promise<DocumentDescriptor> {
  const startedAt = nowMs();
  const proposalId = normalizeProposalId(args.proposalId);
  const scopeKey = buildAccountantProposalScopeKey(proposalId);
  const alreadyInFlight = accountantProposalPdfInFlight.get(scopeKey);
  if (alreadyInFlight) {
    const descriptor = await alreadyInFlight;
    recordProposalPdfReady({
      proposalId,
      startedAt,
      result: "joined_inflight",
      cacheLayer: "inflight",
    });
    return descriptor;
  }

  let task: Promise<DocumentDescriptor>;
  task = Promise.resolve().then(async (): Promise<DocumentDescriptor> => {
    const cached = getAccountantProposalPdfCache(scopeKey);
    if (cached && cached.manifest.documentScope.proposalId === proposalId) {
      if (await canReuseDescriptor(cached.descriptor)) {
        recordProposalPdfReady({
          proposalId,
          startedAt,
          result: "cache_hit",
          cacheLayer: "memory",
          manifest: cached.manifest,
        });
        return cached.descriptor;
      }
      accountantProposalPdfCache.delete(scopeKey);
    }

    const stored = await readAccountantProposalPdfStoredCache(proposalId);
    if (stored) {
      setAccountantProposalPdfCache(scopeKey, stored.descriptor, stored.manifest);
      recordProposalPdfReady({
        proposalId,
        startedAt,
        result: "cache_hit",
        cacheLayer: "storage",
        manifest: stored.manifest,
      });
      return stored.descriptor;
    }

    const html = await buildProposalPdfHtml(proposalId);
    const manifest = buildAccountantProposalPdfManifestContract({
      proposalId,
      html,
      fileName: args.fileName,
    });
    const descriptor = await renderProposalDescriptor({
      proposalId,
      html,
      title: args.title,
      fileName: args.fileName,
    });
    setAccountantProposalPdfCache(scopeKey, descriptor, manifest);
    await writeAccountantProposalPdfStoredCache(proposalId, manifest, descriptor);
    recordProposalPdfReady({
      proposalId,
      startedAt,
      result: "success",
      cacheLayer: "rebuild",
      manifest,
    });
    return descriptor;
  }).finally(() => {
    if (accountantProposalPdfInFlight.get(scopeKey) === task) {
      accountantProposalPdfInFlight.delete(scopeKey);
    }
  });
  accountantProposalPdfInFlight.set(scopeKey, task);
  return await task;
}

export function clearAccountantProposalPdfDocumentCacheForTests() {
  accountantProposalPdfCache.clear();
  accountantProposalPdfInFlight.clear();
}
