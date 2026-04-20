import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";

import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { exportPaymentOrderPdfContract } from "../../lib/api/pdf_payment";
import {
  preparePaymentOrderPdf,
  type PaymentOrderPdfContract,
} from "../../lib/api/paymentPdf.service";
import type { PaymentPdfDraft } from "../../lib/api/types";
import { buildGeneratedPdfDescriptor } from "../../lib/pdf/pdf.runner";
import { createPdfSource } from "../../lib/pdfFileContract";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  buildAccountantPaymentReportPdfManifestContract,
  type AccountantPaymentReportPdfManifestContract,
} from "./accountantPaymentReportPdf.shared";

const ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS = 30 * 60 * 1000;
const ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_MAX = 20;

type AccountantPaymentReportPdfCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  manifest: AccountantPaymentReportPdfManifestContract;
};

type AccountantPaymentReportPdfStoredCacheEntry = {
  version: 1;
  manifest: AccountantPaymentReportPdfManifestContract;
  descriptor: DocumentDescriptor;
};

export type GenerateAccountantPaymentReportPdfDocumentArgs = {
  paymentId: string | number;
  title?: string | null;
  fileName?: string | null;
  draft?: PaymentPdfDraft;
};

const accountantPaymentReportPdfCache =
  new Map<string, AccountantPaymentReportPdfCacheEntry>();
const accountantPaymentReportPdfInFlight =
  new Map<string, Promise<DocumentDescriptor>>();

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

function hashAccountantPaymentReportCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizePaymentId(value: string | number) {
  const paymentId = Number(value);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("accountant payment report PDF paymentId is required");
  }
  return paymentId;
}

function buildAccountantPaymentReportScopeKey(paymentId: number) {
  return `acc_payment_report:${paymentId}`;
}

function buildAccountantPaymentReportStoredCacheKey(paymentId: number) {
  return `pdf.acc.payment-report.v1.${hashAccountantPaymentReportCacheKey(String(paymentId))}`;
}

function recordPaymentReportReady(args: {
  paymentId: number;
  startedAt: number;
  result: "success" | "cache_hit" | "joined_inflight";
  cacheLayer: "memory" | "storage" | "rebuild" | "inflight";
  manifest?: AccountantPaymentReportPdfManifestContract | null;
}) {
  recordPlatformObservability({
    screen: "accountant",
    surface: "accountant_payment_report_pdf",
    category: "fetch",
    event: "accountant_payment_report_pdf_ready",
    result: args.result,
    durationMs: Math.max(0, Math.round(nowMs() - args.startedAt)),
    sourceKind: "pdf:payment_order",
    cacheLayer: args.cacheLayer,
    extra: {
      paymentId: args.paymentId,
      documentKind: args.manifest?.documentKind ?? "accountant_payment_report",
      sourceVersion: args.manifest?.sourceVersion ?? null,
      artifactVersion: args.manifest?.artifactVersion ?? null,
      cacheStatus: args.cacheLayer,
    },
  });
}

function isAccountantPaymentReportStoredCacheEntry(
  value: unknown,
): value is AccountantPaymentReportPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccountantPaymentReportPdfStoredCacheEntry>;
  return record.version === 1 &&
    Boolean(record.manifest) &&
    typeof record.manifest === "object" &&
    Boolean(record.descriptor) &&
    typeof record.descriptor === "object";
}

function getAccountantPaymentReportPdfCache(
  key: string,
): AccountantPaymentReportPdfCacheEntry | null {
  const hit = accountantPaymentReportPdfCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS) {
    accountantPaymentReportPdfCache.delete(key);
    return null;
  }
  accountantPaymentReportPdfCache.delete(key);
  accountantPaymentReportPdfCache.set(key, hit);
  return hit;
}

function setAccountantPaymentReportPdfCache(
  key: string,
  descriptor: DocumentDescriptor,
  manifest: AccountantPaymentReportPdfManifestContract,
) {
  if (accountantPaymentReportPdfCache.has(key)) {
    accountantPaymentReportPdfCache.delete(key);
  }
  accountantPaymentReportPdfCache.set(key, {
    ts: Date.now(),
    descriptor,
    manifest,
  });
  while (accountantPaymentReportPdfCache.size > ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_MAX) {
    const oldestKey = accountantPaymentReportPdfCache.keys().next().value;
    if (!oldestKey) break;
    accountantPaymentReportPdfCache.delete(oldestKey);
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
    if (__DEV__) {
      console.warn("[accountant-payment-report-pdf] reuse_probe_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        uri: sourceUri,
      });
    }
    return false;
  }
}

async function readAccountantPaymentReportPdfStoredCache(
  paymentId: number,
): Promise<AccountantPaymentReportPdfCacheEntry | null> {
  const cacheKey = buildAccountantPaymentReportStoredCacheKey(paymentId);
  const stored = await readStoredJson<AccountantPaymentReportPdfStoredCacheEntry>({
    screen: "accountant",
    surface: "accountant_payment_report_pdf",
    key: cacheKey,
  });
  if (!isAccountantPaymentReportStoredCacheEntry(stored)) return null;
  if (
    stored.manifest.status !== "ready" ||
    stored.manifest.documentScope.paymentId !== String(paymentId) ||
    !(await canReuseDescriptor(stored.descriptor))
  ) {
    await removeStoredValue({
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
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

async function writeAccountantPaymentReportPdfStoredCache(
  paymentId: number,
  manifest: AccountantPaymentReportPdfManifestContract,
  descriptor: DocumentDescriptor,
) {
  if (descriptor.fileSource.kind === "blob") return;
  await writeStoredJson<AccountantPaymentReportPdfStoredCacheEntry>(
    {
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
      key: buildAccountantPaymentReportStoredCacheKey(paymentId),
      ttlMs: ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS,
    },
    {
      version: 1,
      manifest,
      descriptor,
    },
  );
}

function buildDescriptorForContract(
  contract: PaymentOrderPdfContract,
): Promise<DocumentDescriptor> {
  return buildGeneratedPdfDescriptor({
    getUri: () => exportPaymentOrderPdfContract(contract),
    title: contract.title,
    fileName: contract.fileName,
    documentType: contract.documentType,
    originModule: "accountant",
    entityId: contract.entityId,
  });
}

export async function generateAccountantPaymentReportPdfDocument(
  args: GenerateAccountantPaymentReportPdfDocumentArgs,
): Promise<DocumentDescriptor> {
  const startedAt = nowMs();
  const paymentId = normalizePaymentId(args.paymentId);
  const scopeKey = buildAccountantPaymentReportScopeKey(paymentId);
  const alreadyInFlight = accountantPaymentReportPdfInFlight.get(scopeKey);
  if (alreadyInFlight) {
    const descriptor = await alreadyInFlight;
    recordPaymentReportReady({
      paymentId,
      startedAt,
      result: "joined_inflight",
      cacheLayer: "inflight",
    });
    return descriptor;
  }

  let task: Promise<DocumentDescriptor>;
  task = Promise.resolve().then(async (): Promise<DocumentDescriptor> => {
    const cached = getAccountantPaymentReportPdfCache(scopeKey);
    if (cached && cached.manifest.documentScope.paymentId === String(paymentId)) {
      if (await canReuseDescriptor(cached.descriptor)) {
        recordPaymentReportReady({
          paymentId,
          startedAt,
          result: "cache_hit",
          cacheLayer: "memory",
          manifest: cached.manifest,
        });
        return cached.descriptor;
      }
      accountantPaymentReportPdfCache.delete(scopeKey);
    }

    const stored = await readAccountantPaymentReportPdfStoredCache(paymentId);
    if (stored) {
      setAccountantPaymentReportPdfCache(scopeKey, stored.descriptor, stored.manifest);
      recordPaymentReportReady({
        paymentId,
        startedAt,
        result: "cache_hit",
        cacheLayer: "storage",
        manifest: stored.manifest,
      });
      return stored.descriptor;
    }

    const prepared = await preparePaymentOrderPdf({
      paymentId,
      draft: args.draft,
      title: args.title ?? undefined,
      fileName: args.fileName ?? undefined,
    });
    const manifest = buildAccountantPaymentReportPdfManifestContract(prepared.contract);
    const descriptor = await buildDescriptorForContract(prepared.contract);
    setAccountantPaymentReportPdfCache(scopeKey, descriptor, manifest);
    await writeAccountantPaymentReportPdfStoredCache(paymentId, manifest, descriptor);
    recordPaymentReportReady({
      paymentId,
      startedAt,
      result: "success",
      cacheLayer: "rebuild",
      manifest,
    });
    return descriptor;
  }).finally(() => {
    if (accountantPaymentReportPdfInFlight.get(scopeKey) === task) {
      accountantPaymentReportPdfInFlight.delete(scopeKey);
    }
  });
  accountantPaymentReportPdfInFlight.set(scopeKey, task);
  return await task;
}

export function clearAccountantPaymentReportPdfDocumentCacheForTests() {
  accountantPaymentReportPdfCache.clear();
  accountantPaymentReportPdfInFlight.clear();
}
