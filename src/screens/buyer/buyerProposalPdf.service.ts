import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";

import { generateProposalPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";
import {
  buildBuyerProposalPdfManifestContract,
  type BuyerProposalPdfManifestContract,
  type BuyerProposalPdfSnapshot,
} from "./buyerProposalPdf.shared";

const BUYER_PROPOSAL_PDF_CACHE_TTL_MS = 30 * 60 * 1000;
const BUYER_PROPOSAL_PDF_CACHE_MAX = 20;

type BuyerProposalPdfCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  sourceVersion: string;
  artifactVersion: string;
};

type BuyerProposalPdfStoredCacheEntry = {
  version: 1;
  sourceVersion: string;
  artifactVersion: string;
  descriptor: DocumentDescriptor;
};

export type GenerateBuyerProposalPdfDocumentArgs = BuyerProposalPdfSnapshot & {
  proposalId: string | number;
  title?: string | null;
  fileName?: string | null;
};

const buyerProposalPdfCache = new Map<string, BuyerProposalPdfCacheEntry>();
const buyerProposalPdfInFlight = new Map<string, Promise<DocumentDescriptor>>();

function hashBuyerProposalCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildBuyerProposalStoredCacheKey(artifactVersion: string) {
  return `pdf.pur.buyer.proposal.v1.${hashBuyerProposalCacheKey(artifactVersion)}`;
}

function isBuyerProposalStoredCacheEntry(
  value: unknown,
): value is BuyerProposalPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BuyerProposalPdfStoredCacheEntry>;
  return record.version === 1 &&
    typeof record.sourceVersion === "string" &&
    typeof record.artifactVersion === "string" &&
    Boolean(record.descriptor) &&
    typeof record.descriptor === "object";
}

function getBuyerProposalPdfCache(key: string): BuyerProposalPdfCacheEntry | null {
  const hit = buyerProposalPdfCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= BUYER_PROPOSAL_PDF_CACHE_TTL_MS) {
    buyerProposalPdfCache.delete(key);
    return null;
  }
  buyerProposalPdfCache.delete(key);
  buyerProposalPdfCache.set(key, hit);
  return hit;
}

function setBuyerProposalPdfCache(
  key: string,
  descriptor: DocumentDescriptor,
  manifest: BuyerProposalPdfManifestContract,
) {
  if (buyerProposalPdfCache.has(key)) buyerProposalPdfCache.delete(key);
  buyerProposalPdfCache.set(key, {
    ts: Date.now(),
    descriptor,
    sourceVersion: manifest.sourceVersion,
    artifactVersion: manifest.artifactVersion,
  });
  while (buyerProposalPdfCache.size > BUYER_PROPOSAL_PDF_CACHE_MAX) {
    const oldestKey = buyerProposalPdfCache.keys().next().value;
    if (!oldestKey) break;
    buyerProposalPdfCache.delete(oldestKey);
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
    if (__DEV__) console.warn("[buyer-proposal-pdf] reuse_probe_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      uri: sourceUri,
    });
    return false;
  }
}

async function readBuyerProposalPdfStoredCache(
  manifest: BuyerProposalPdfManifestContract,
): Promise<DocumentDescriptor | null> {
  const stored = await readStoredJson<BuyerProposalPdfStoredCacheEntry>({
    screen: "buyer",
    surface: "buyer_proposal_pdf",
    key: buildBuyerProposalStoredCacheKey(manifest.artifactVersion),
  });
  if (!isBuyerProposalStoredCacheEntry(stored)) return null;
  if (
    stored.sourceVersion !== manifest.sourceVersion ||
    stored.artifactVersion !== manifest.artifactVersion ||
    !(await canReuseDescriptor(stored.descriptor))
  ) {
    await removeStoredValue({
      screen: "buyer",
      surface: "buyer_proposal_pdf",
      key: buildBuyerProposalStoredCacheKey(manifest.artifactVersion),
    });
    return null;
  }
  return stored.descriptor;
}

async function writeBuyerProposalPdfStoredCache(
  manifest: BuyerProposalPdfManifestContract,
  descriptor: DocumentDescriptor,
) {
  if (descriptor.fileSource.kind === "blob") return;
  await writeStoredJson<BuyerProposalPdfStoredCacheEntry>(
    {
      screen: "buyer",
      surface: "buyer_proposal_pdf",
      key: buildBuyerProposalStoredCacheKey(manifest.artifactVersion),
      ttlMs: BUYER_PROPOSAL_PDF_CACHE_TTL_MS,
    },
    {
      version: 1,
      sourceVersion: manifest.sourceVersion,
      artifactVersion: manifest.artifactVersion,
      descriptor,
    },
  );
}

function hasReusableSnapshot(args: BuyerProposalPdfSnapshot) {
  return Array.isArray(args.lines) && args.lines.length > 0;
}

export async function generateBuyerProposalPdfDocument(
  args: GenerateBuyerProposalPdfDocumentArgs,
): Promise<DocumentDescriptor> {
  const proposalId = String(args.proposalId ?? "").trim();
  if (!proposalId) throw new Error("buyer proposal PDF proposalId is required");

  if (!hasReusableSnapshot(args)) {
    return await generateProposalPdfDocument({
      proposalId,
      originModule: "buyer",
      title: args.title ?? undefined,
      fileName: args.fileName ?? undefined,
    });
  }

  const manifest = buildBuyerProposalPdfManifestContract({
    proposalId,
    fileName: args.fileName,
    head: args.head,
    lines: args.lines,
  });
  const cacheKey = manifest.artifactVersion;
  const alreadyInFlight = buyerProposalPdfInFlight.get(cacheKey);
  if (alreadyInFlight) return await alreadyInFlight;

  let task: Promise<DocumentDescriptor>;
  task = Promise.resolve().then(async (): Promise<DocumentDescriptor> => {
    const cached = getBuyerProposalPdfCache(cacheKey);
    if (cached && cached.sourceVersion === manifest.sourceVersion) {
      if (await canReuseDescriptor(cached.descriptor)) return cached.descriptor;
      buyerProposalPdfCache.delete(cacheKey);
    }

    const stored = await readBuyerProposalPdfStoredCache(manifest);
    if (stored) {
      setBuyerProposalPdfCache(cacheKey, stored, manifest);
      return stored;
    }

    const descriptor = await generateProposalPdfDocument({
      proposalId,
      originModule: "buyer",
      title: args.title ?? undefined,
      fileName: args.fileName ?? undefined,
    });
    setBuyerProposalPdfCache(cacheKey, descriptor, manifest);
    await writeBuyerProposalPdfStoredCache(manifest, descriptor);
    return descriptor;
  }).finally(() => {
    if (buyerProposalPdfInFlight.get(cacheKey) === task) {
      buyerProposalPdfInFlight.delete(cacheKey);
    }
  });
  buyerProposalPdfInFlight.set(cacheKey, task);
  return await task;
}

export function clearBuyerProposalPdfDocumentCacheForTests() {
  buyerProposalPdfCache.clear();
  buyerProposalPdfInFlight.clear();
}
