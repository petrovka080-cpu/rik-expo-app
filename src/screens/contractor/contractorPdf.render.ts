import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";

import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { buildContractorActPdfHtml } from "../../lib/pdf/pdf.contractor";
import { renderPdfHtmlToSource } from "../../lib/pdf/pdf.runner";
import { createPdfSource } from "../../lib/pdfFileContract";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";
import {
  buildContractorActManifestContract,
  type ContractorActManifestContract,
} from "./contractorActPdf.shared";
import type { ContractorActPdfData } from "./contractorPdf.data";

const CONTRACTOR_ACT_PDF_CACHE_TTL_MS = 30 * 60 * 1000;
const CONTRACTOR_ACT_PDF_CACHE_MAX = 20;

type ContractorActPdfCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  sourceVersion: string;
  artifactVersion: string;
};

type ContractorActPdfStoredCacheEntry = {
  version: 1;
  sourceVersion: string;
  artifactVersion: string;
  descriptor: DocumentDescriptor;
};

const contractorActPdfCache = new Map<string, ContractorActPdfCacheEntry>();
const contractorActPdfInFlight = new Map<string, Promise<DocumentDescriptor>>();

function hashContractorActCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildContractorActStoredCacheKey(artifactVersion: string) {
  return `pdf.z5.contractor.act.v1.${hashContractorActCacheKey(artifactVersion)}`;
}

function isContractorActStoredCacheEntry(
  value: unknown,
): value is ContractorActPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ContractorActPdfStoredCacheEntry>;
  return record.version === 1 &&
    typeof record.sourceVersion === "string" &&
    typeof record.artifactVersion === "string" &&
    Boolean(record.descriptor) &&
    typeof record.descriptor === "object";
}

function getContractorActPdfCache(key: string): ContractorActPdfCacheEntry | null {
  const hit = contractorActPdfCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= CONTRACTOR_ACT_PDF_CACHE_TTL_MS) {
    contractorActPdfCache.delete(key);
    return null;
  }
  contractorActPdfCache.delete(key);
  contractorActPdfCache.set(key, hit);
  return hit;
}

function setContractorActPdfCache(
  key: string,
  descriptor: DocumentDescriptor,
  manifest: ContractorActManifestContract,
) {
  if (contractorActPdfCache.has(key)) contractorActPdfCache.delete(key);
  contractorActPdfCache.set(key, {
    ts: Date.now(),
    descriptor,
    sourceVersion: manifest.sourceVersion,
    artifactVersion: manifest.artifactVersion,
  });
  while (contractorActPdfCache.size > CONTRACTOR_ACT_PDF_CACHE_MAX) {
    const oldestKey = contractorActPdfCache.keys().next().value;
    if (!oldestKey) break;
    contractorActPdfCache.delete(oldestKey);
  }
}

async function canReuseDescriptor(descriptor: DocumentDescriptor): Promise<boolean> {
  let sourceUri = "";
  try {
    const source = descriptor.fileSource ?? createPdfSource(descriptor.uri);
    sourceUri = source.uri;
    if (source.kind === "remote-url") return true;
    if (source.kind === "blob") return Platform.OS === "web";
    const info = await FileSystemModule.getInfoAsync(source.uri);
    return Boolean(info?.exists);
  } catch (error) {
    if (__DEV__) console.warn("[contractor-pdf] reuse_probe_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      uri: sourceUri,
    });
    return false;
  }
}

async function readContractorActPdfStoredCache(
  manifest: ContractorActManifestContract,
): Promise<DocumentDescriptor | null> {
  const stored = await readStoredJson<ContractorActPdfStoredCacheEntry>({
    screen: "contractor",
    surface: "contractor_act_pdf",
    key: buildContractorActStoredCacheKey(manifest.artifactVersion),
  });
  if (!isContractorActStoredCacheEntry(stored)) return null;
  if (
    stored.sourceVersion !== manifest.sourceVersion ||
    stored.artifactVersion !== manifest.artifactVersion ||
    !(await canReuseDescriptor(stored.descriptor))
  ) {
    await removeStoredValue({
      screen: "contractor",
      surface: "contractor_act_pdf",
      key: buildContractorActStoredCacheKey(manifest.artifactVersion),
    });
    return null;
  }
  return stored.descriptor;
}

async function writeContractorActPdfStoredCache(
  manifest: ContractorActManifestContract,
  descriptor: DocumentDescriptor,
) {
  if (descriptor.fileSource.kind === "blob") return;
  await writeStoredJson<ContractorActPdfStoredCacheEntry>(
    {
      screen: "contractor",
      surface: "contractor_act_pdf",
      key: buildContractorActStoredCacheKey(manifest.artifactVersion),
      ttlMs: CONTRACTOR_ACT_PDF_CACHE_TTL_MS,
    },
    {
      version: 1,
      sourceVersion: manifest.sourceVersion,
      artifactVersion: manifest.artifactVersion,
      descriptor,
    },
  );
}

export async function renderContractorActPdfDocument(
  data: ContractorActPdfData,
): Promise<DocumentDescriptor> {
  const manifest = buildContractorActManifestContract(data);
  const cacheKey = manifest.artifactVersion;
  const alreadyInFlight = contractorActPdfInFlight.get(cacheKey);
  if (alreadyInFlight) return await alreadyInFlight;

  let task: Promise<DocumentDescriptor>;
  task = Promise.resolve().then(async (): Promise<DocumentDescriptor> => {
    const cached = getContractorActPdfCache(cacheKey);
    if (cached && cached.sourceVersion === manifest.sourceVersion) {
      if (await canReuseDescriptor(cached.descriptor)) return cached.descriptor;
      contractorActPdfCache.delete(cacheKey);
    }

    const stored = await readContractorActPdfStoredCache(manifest);
    if (stored) {
      setContractorActPdfCache(cacheKey, stored, manifest);
      return stored;
    }

    const html = buildContractorActPdfHtml(data.work, data.materials, data.options);
    const fileSource = await renderPdfHtmlToSource({
      html,
      documentType: "contractor_act",
      source: "contractor_generate_work_pdf",
    });

    const descriptor = await createGeneratedPdfDocument({
      fileSource,
      title: data.title,
      fileName: data.fileName,
      documentType: "contractor_act",
      originModule: "contractor",
      entityId: data.work.progress_id || data.actNo,
    });
    setContractorActPdfCache(cacheKey, descriptor, manifest);
    await writeContractorActPdfStoredCache(manifest, descriptor);
    return descriptor;
  }).finally(() => {
    if (contractorActPdfInFlight.get(cacheKey) === task) {
      contractorActPdfInFlight.delete(cacheKey);
    }
  });
  contractorActPdfInFlight.set(cacheKey, task);
  return await task;
}

export function clearContractorActPdfRenderCacheForTests() {
  contractorActPdfCache.clear();
  contractorActPdfInFlight.clear();
}
