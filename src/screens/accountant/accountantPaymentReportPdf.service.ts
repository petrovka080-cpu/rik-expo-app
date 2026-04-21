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
  type AccountantPaymentReportPdfManifestStatus,
  type AccountantPaymentReportPdfManifestContract,
} from "./accountantPaymentReportPdf.shared";

const ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS = 30 * 60 * 1000;
const ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_MAX = 20;
const ACCOUNTANT_PAYMENT_REPORT_READY_REUSE_WINDOW_MS = 5 * 60 * 1000;
const ACCOUNTANT_PAYMENT_REPORT_READINESS_RECORD_VERSION = 1;
const ACCOUNTANT_PAYMENT_REPORT_ARTIFACT_RECORD_VERSION = 2;

export type AccountantPaymentReportReadinessRecord = {
  version: typeof ACCOUNTANT_PAYMENT_REPORT_READINESS_RECORD_VERSION;
  manifest: AccountantPaymentReportPdfManifestContract;
  lastErrorMessage: string | null;
};

export type AccountantPaymentReportArtifactRecord = {
  version: typeof ACCOUNTANT_PAYMENT_REPORT_ARTIFACT_RECORD_VERSION;
  sourceVersion: string;
  artifactVersion: string;
  descriptor: DocumentDescriptor | null;
  contractSnapshot: PaymentOrderPdfContract | null;
};

type AccountantPaymentReportArtifactCacheEntry = {
  ts: number;
  descriptor: DocumentDescriptor;
  sourceVersion: string;
  artifactVersion: string;
  contractSnapshot: PaymentOrderPdfContract | null;
};

type AccountantPaymentReportReadinessCacheEntry = {
  ts: number;
  record: AccountantPaymentReportReadinessRecord;
};

export type GenerateAccountantPaymentReportPdfDocumentArgs = {
  paymentId: string | number;
  title?: string | null;
  fileName?: string | null;
  draft?: PaymentPdfDraft;
};

const accountantPaymentReportPdfArtifactCache =
  new Map<string, AccountantPaymentReportArtifactCacheEntry>();
const accountantPaymentReportPdfReadinessCache =
  new Map<string, AccountantPaymentReportReadinessCacheEntry>();
const accountantPaymentReportPdfInFlight =
  new Map<string, Promise<DocumentDescriptor>>();

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const nowIso = () => new Date().toISOString();

const trimText = (value: unknown) => String(value ?? "").trim();

function hashAccountantPaymentReportCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildAccountantPaymentReportScopeKey(paymentId: number) {
  return `acc_payment_report:${paymentId}`;
}

export function buildAccountantPaymentReportReadinessStorageKey(paymentId: number) {
  return `pdf.acc.payment-report.readiness.v2.${hashAccountantPaymentReportCacheKey(String(paymentId))}`;
}

export function buildAccountantPaymentReportArtifactStorageKey(artifactVersion: string) {
  return `pdf.acc.payment-report.artifact.v2.${hashAccountantPaymentReportCacheKey(artifactVersion)}`;
}

export function createAccountantPaymentReportReadinessRecord(
  manifest: AccountantPaymentReportPdfManifestContract,
  lastErrorMessage?: string | null,
): AccountantPaymentReportReadinessRecord {
  return {
    version: ACCOUNTANT_PAYMENT_REPORT_READINESS_RECORD_VERSION,
    manifest,
    lastErrorMessage: trimText(lastErrorMessage) || null,
  };
}

export function createAccountantPaymentReportArtifactRecord(
  manifest: AccountantPaymentReportPdfManifestContract,
  descriptor: DocumentDescriptor,
  contractSnapshot?: PaymentOrderPdfContract | null,
): AccountantPaymentReportArtifactRecord {
  const shouldPersistDescriptor = descriptor.fileSource.kind !== "blob";
  return {
    version: ACCOUNTANT_PAYMENT_REPORT_ARTIFACT_RECORD_VERSION,
    sourceVersion: manifest.sourceVersion,
    artifactVersion: manifest.artifactVersion,
    descriptor: shouldPersistDescriptor ? descriptor : null,
    contractSnapshot: contractSnapshot ?? null,
  };
}

export function hydrateAccountantPaymentReportManifest(
  manifest: AccountantPaymentReportPdfManifestContract,
  args: {
    status: AccountantPaymentReportPdfManifestStatus;
    lastBuiltAt?: string | null;
    lastSourceChangeAt?: string | null;
    lastSuccessfulArtifact?: string | null;
  },
): AccountantPaymentReportPdfManifestContract {
  const lastSuccessfulArtifact =
    trimText(args.lastSuccessfulArtifact) ||
    (args.status === "ready" ? manifest.artifactPath : null);

  return {
    ...manifest,
    status: args.status,
    lastBuiltAt: trimText(args.lastBuiltAt) || null,
    lastSourceChangeAt: trimText(args.lastSourceChangeAt) || null,
    lastSuccessfulArtifact,
  };
}

export function isAccountantPaymentReportReadinessRecord(
  value: unknown,
): value is AccountantPaymentReportReadinessRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccountantPaymentReportReadinessRecord>;
  return (
    record.version === ACCOUNTANT_PAYMENT_REPORT_READINESS_RECORD_VERSION &&
    Boolean(record.manifest) &&
    typeof record.manifest === "object"
  );
}

export function isAccountantPaymentReportArtifactRecord(
  value: unknown,
): value is AccountantPaymentReportArtifactRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccountantPaymentReportArtifactRecord>;
  const hasDescriptor =
    record.descriptor != null &&
    typeof record.descriptor === "object";
  const hasContractSnapshot =
    record.contractSnapshot != null &&
    typeof record.contractSnapshot === "object";
  return (
    record.version === ACCOUNTANT_PAYMENT_REPORT_ARTIFACT_RECORD_VERSION &&
    typeof record.sourceVersion === "string" &&
    typeof record.artifactVersion === "string" &&
    (hasDescriptor || hasContractSnapshot)
  );
}

function isPaymentOrderPdfContract(value: unknown): value is PaymentOrderPdfContract {
  if (!value || typeof value !== "object") return false;
  const contract = value as Partial<PaymentOrderPdfContract>;
  return (
    contract.documentType === "payment_order" &&
    typeof contract.entityId === "string" &&
    contract.payload != null &&
    typeof contract.payload === "object"
  );
}

function isReadinessFastReusable(
  record: AccountantPaymentReportReadinessRecord | null,
) {
  if (!record) return false;
  if (record.manifest.status !== "ready") return false;
  const lastBuiltAt = trimText(record.manifest.lastBuiltAt);
  if (!lastBuiltAt) return false;
  const lastBuiltAtMs = Date.parse(lastBuiltAt);
  if (!Number.isFinite(lastBuiltAtMs)) return false;
  return Date.now() - lastBuiltAtMs <= ACCOUNTANT_PAYMENT_REPORT_READY_REUSE_WINDOW_MS;
}

function normalizePaymentId(value: string | number) {
  const paymentId = Number(value);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("accountant payment report PDF paymentId is required");
  }
  return paymentId;
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
      manifestStatus: args.manifest?.status ?? null,
      cacheStatus: args.cacheLayer,
    },
  });
}

function getAccountantPaymentReportArtifactCache(
  key: string,
): AccountantPaymentReportArtifactCacheEntry | null {
  const hit = accountantPaymentReportPdfArtifactCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS) {
    accountantPaymentReportPdfArtifactCache.delete(key);
    return null;
  }
  accountantPaymentReportPdfArtifactCache.delete(key);
  accountantPaymentReportPdfArtifactCache.set(key, hit);
  return hit;
}

function setAccountantPaymentReportArtifactCache(
  manifest: AccountantPaymentReportPdfManifestContract,
  descriptor: DocumentDescriptor,
  contractSnapshot?: PaymentOrderPdfContract | null,
) {
  const key = manifest.artifactVersion;
  if (accountantPaymentReportPdfArtifactCache.has(key)) {
    accountantPaymentReportPdfArtifactCache.delete(key);
  }
  accountantPaymentReportPdfArtifactCache.set(key, {
    ts: Date.now(),
    descriptor,
    sourceVersion: manifest.sourceVersion,
    artifactVersion: manifest.artifactVersion,
    contractSnapshot: contractSnapshot ?? null,
  });
  while (accountantPaymentReportPdfArtifactCache.size > ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_MAX) {
    const oldestKey = accountantPaymentReportPdfArtifactCache.keys().next().value;
    if (!oldestKey) break;
    accountantPaymentReportPdfArtifactCache.delete(oldestKey);
  }
}

function getAccountantPaymentReportReadinessCache(
  key: string,
): AccountantPaymentReportReadinessRecord | null {
  const hit = accountantPaymentReportPdfReadinessCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS) {
    accountantPaymentReportPdfReadinessCache.delete(key);
    return null;
  }
  accountantPaymentReportPdfReadinessCache.delete(key);
  accountantPaymentReportPdfReadinessCache.set(key, hit);
  return hit.record;
}

function setAccountantPaymentReportReadinessCache(
  key: string,
  record: AccountantPaymentReportReadinessRecord,
) {
  if (accountantPaymentReportPdfReadinessCache.has(key)) {
    accountantPaymentReportPdfReadinessCache.delete(key);
  }
  accountantPaymentReportPdfReadinessCache.set(key, {
    ts: Date.now(),
    record,
  });
  while (accountantPaymentReportPdfReadinessCache.size > ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_MAX) {
    const oldestKey = accountantPaymentReportPdfReadinessCache.keys().next().value;
    if (!oldestKey) break;
    accountantPaymentReportPdfReadinessCache.delete(oldestKey);
  }
}

function getPreviousSuccessfulArtifact(
  readiness: AccountantPaymentReportReadinessRecord | null,
) {
  const manifest = readiness?.manifest;
  if (!manifest) return null;
  return manifest.lastSuccessfulArtifact || (manifest.status === "ready" ? manifest.artifactPath : null);
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

async function readAccountantPaymentReportReadiness(
  paymentId: number,
): Promise<AccountantPaymentReportReadinessRecord | null> {
  const storageKey = buildAccountantPaymentReportReadinessStorageKey(paymentId);
  const stored = await readStoredJson<AccountantPaymentReportReadinessRecord>({
    screen: "accountant",
    surface: "accountant_payment_report_pdf",
    key: storageKey,
  });
  if (!isAccountantPaymentReportReadinessRecord(stored)) {
    if (stored != null) {
      await removeStoredValue({
        screen: "accountant",
        surface: "accountant_payment_report_pdf",
        key: storageKey,
      });
    }
    return null;
  }
  if (stored.manifest.documentScope.paymentId !== String(paymentId)) {
    await removeStoredValue({
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
      key: storageKey,
    });
    return null;
  }
  return stored;
}

async function writeAccountantPaymentReportReadiness(
  paymentId: number,
  record: AccountantPaymentReportReadinessRecord,
) {
  await writeStoredJson<AccountantPaymentReportReadinessRecord>(
    {
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
      key: buildAccountantPaymentReportReadinessStorageKey(paymentId),
    },
    record,
  );
}

async function readAccountantPaymentReportArtifact(
  manifest: AccountantPaymentReportPdfManifestContract,
): Promise<AccountantPaymentReportArtifactCacheEntry | null> {
  const storageKey = buildAccountantPaymentReportArtifactStorageKey(
    manifest.artifactVersion,
  );
  const stored = await readStoredJson<AccountantPaymentReportArtifactRecord>({
    screen: "accountant",
    surface: "accountant_payment_report_pdf",
    key: storageKey,
  });
  if (!isAccountantPaymentReportArtifactRecord(stored)) {
    if (stored != null) {
      await removeStoredValue({
        screen: "accountant",
        surface: "accountant_payment_report_pdf",
        key: storageKey,
      });
    }
    return null;
  }
  const storedDescriptor = stored.descriptor ?? null;
  const storedContractSnapshot = isPaymentOrderPdfContract(stored.contractSnapshot)
    ? stored.contractSnapshot
    : null;
  const descriptorReusable = storedDescriptor
    ? await canReuseDescriptor(storedDescriptor)
    : false;
  const hasReusableStoredArtifact = descriptorReusable || storedContractSnapshot != null;
  if (
    stored.sourceVersion !== manifest.sourceVersion ||
    stored.artifactVersion !== manifest.artifactVersion ||
    !hasReusableStoredArtifact
  ) {
    await removeStoredValue({
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
      key: storageKey,
    });
    return null;
  }
  return {
    ts: Date.now(),
    descriptor: descriptorReusable && storedDescriptor
      ? storedDescriptor
      : (await buildDescriptorForContract(storedContractSnapshot!)),
    sourceVersion: stored.sourceVersion,
    artifactVersion: stored.artifactVersion,
    contractSnapshot: storedContractSnapshot,
  };
}

async function writeAccountantPaymentReportArtifact(
  manifest: AccountantPaymentReportPdfManifestContract,
  descriptor: DocumentDescriptor,
  contractSnapshot?: PaymentOrderPdfContract | null,
) {
  await writeStoredJson<AccountantPaymentReportArtifactRecord>(
    {
      screen: "accountant",
      surface: "accountant_payment_report_pdf",
      key: buildAccountantPaymentReportArtifactStorageKey(manifest.artifactVersion),
      ttlMs: ACCOUNTANT_PAYMENT_REPORT_PDF_CACHE_TTL_MS,
    },
    createAccountantPaymentReportArtifactRecord(manifest, descriptor, contractSnapshot),
  );
}

async function persistAccountantPaymentReportReadiness(args: {
  scopeKey: string;
  paymentId: number;
  record: AccountantPaymentReportReadinessRecord;
}) {
  setAccountantPaymentReportReadinessCache(args.scopeKey, args.record);
  await writeAccountantPaymentReportReadiness(args.paymentId, args.record);
}

async function resolveAccountantPaymentReportReusableArtifact(
  manifest: AccountantPaymentReportPdfManifestContract,
): Promise<{
  descriptor: DocumentDescriptor;
  cacheLayer: "memory" | "storage";
} | null> {
  const cached = getAccountantPaymentReportArtifactCache(manifest.artifactVersion);
  if (cached && cached.sourceVersion === manifest.sourceVersion) {
    if (
      cached.descriptor.fileSource.kind !== "blob" &&
      (await canReuseDescriptor(cached.descriptor))
    ) {
      return {
        descriptor: cached.descriptor,
        cacheLayer: "memory",
      };
    }
    if (cached.contractSnapshot) {
      const descriptor = await buildDescriptorForContract(cached.contractSnapshot);
      setAccountantPaymentReportArtifactCache(manifest, descriptor, cached.contractSnapshot);
      return {
        descriptor,
        cacheLayer: "memory",
      };
    }
    accountantPaymentReportPdfArtifactCache.delete(manifest.artifactVersion);
  }

  const stored = await readAccountantPaymentReportArtifact(manifest);
  if (!stored) return null;
  setAccountantPaymentReportArtifactCache(
    manifest,
    stored.descriptor,
    stored.contractSnapshot,
  );
  return {
    descriptor: stored.descriptor,
    cacheLayer: "storage",
  };
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
    const readiness = getAccountantPaymentReportReadinessCache(scopeKey);
    recordPaymentReportReady({
      paymentId,
      startedAt,
      result: "joined_inflight",
      cacheLayer: "inflight",
      manifest: readiness?.manifest ?? null,
    });
    return descriptor;
  }

  let previousReadiness: AccountantPaymentReportReadinessRecord | null = null;
  let currentManifest: AccountantPaymentReportPdfManifestContract | null = null;
  let currentSourceChangeAt: string | null = null;

  let task: Promise<DocumentDescriptor>;
  task = Promise.resolve()
    .then(async (): Promise<DocumentDescriptor> => {
      previousReadiness =
        getAccountantPaymentReportReadinessCache(scopeKey) ||
        (await readAccountantPaymentReportReadiness(paymentId));
      if (previousReadiness) {
        setAccountantPaymentReportReadinessCache(scopeKey, previousReadiness);
      }

      if (!args.draft && isReadinessFastReusable(previousReadiness)) {
        const reusable = await resolveAccountantPaymentReportReusableArtifact(
          previousReadiness.manifest,
        );
        if (reusable) {
          recordPaymentReportReady({
            paymentId,
            startedAt,
            result: "cache_hit",
            cacheLayer: reusable.cacheLayer,
            manifest: previousReadiness.manifest,
          });
          return reusable.descriptor;
        }
      }

      const prepared = await preparePaymentOrderPdf({
        paymentId,
        draft: args.draft,
        title: args.title ?? undefined,
        fileName: args.fileName ?? undefined,
      });
      currentSourceChangeAt = prepared.generatedAt;
      currentManifest = buildAccountantPaymentReportPdfManifestContract(prepared.contract);

      const previousSuccessfulArtifact = getPreviousSuccessfulArtifact(previousReadiness);
      const previousLastBuiltAt = previousReadiness?.manifest.lastBuiltAt ?? null;
      const sameSourceVersion =
        previousReadiness?.manifest.sourceVersion === currentManifest.sourceVersion;

      if (sameSourceVersion) {
        const reusable = await resolveAccountantPaymentReportReusableArtifact(currentManifest);
        if (reusable) {
          const readyRecord = createAccountantPaymentReportReadinessRecord(
            hydrateAccountantPaymentReportManifest(currentManifest, {
              status: "ready",
              lastBuiltAt: previousLastBuiltAt,
              lastSourceChangeAt: currentSourceChangeAt,
              lastSuccessfulArtifact: currentManifest.artifactPath,
            }),
          );
          await persistAccountantPaymentReportReadiness({
            scopeKey,
            paymentId,
            record: readyRecord,
          });
          recordPaymentReportReady({
            paymentId,
            startedAt,
            result: "cache_hit",
            cacheLayer: reusable.cacheLayer,
            manifest: readyRecord.manifest,
          });
          return reusable.descriptor;
        }

        const missingRecord = createAccountantPaymentReportReadinessRecord(
          hydrateAccountantPaymentReportManifest(currentManifest, {
            status: "missing",
            lastBuiltAt: previousLastBuiltAt,
            lastSourceChangeAt: currentSourceChangeAt,
            lastSuccessfulArtifact: previousSuccessfulArtifact,
          }),
        );
        await persistAccountantPaymentReportReadiness({
          scopeKey,
          paymentId,
          record: missingRecord,
        });
      } else if (previousReadiness) {
        const staleRecord = createAccountantPaymentReportReadinessRecord(
          hydrateAccountantPaymentReportManifest(currentManifest, {
            status: "stale",
            lastBuiltAt: previousLastBuiltAt,
            lastSourceChangeAt: currentSourceChangeAt,
            lastSuccessfulArtifact: previousSuccessfulArtifact,
          }),
          previousReadiness.lastErrorMessage,
        );
        await persistAccountantPaymentReportReadiness({
          scopeKey,
          paymentId,
          record: staleRecord,
        });
      }

      const buildingRecord = createAccountantPaymentReportReadinessRecord(
        hydrateAccountantPaymentReportManifest(currentManifest, {
          status: "building",
          lastBuiltAt: previousLastBuiltAt,
          lastSourceChangeAt: currentSourceChangeAt,
          lastSuccessfulArtifact: previousSuccessfulArtifact,
        }),
      );
      await persistAccountantPaymentReportReadiness({
        scopeKey,
        paymentId,
        record: buildingRecord,
      });

      const reusable = await resolveAccountantPaymentReportReusableArtifact(currentManifest);
      if (reusable) {
        const readyRecord = createAccountantPaymentReportReadinessRecord(
          hydrateAccountantPaymentReportManifest(currentManifest, {
            status: "ready",
            lastBuiltAt: previousLastBuiltAt,
            lastSourceChangeAt: currentSourceChangeAt,
            lastSuccessfulArtifact: currentManifest.artifactPath,
          }),
        );
        await persistAccountantPaymentReportReadiness({
          scopeKey,
          paymentId,
          record: readyRecord,
        });
        recordPaymentReportReady({
          paymentId,
          startedAt,
          result: "cache_hit",
          cacheLayer: reusable.cacheLayer,
          manifest: readyRecord.manifest,
        });
        return reusable.descriptor;
      }

      const descriptor = await buildDescriptorForContract(prepared.contract);
      setAccountantPaymentReportArtifactCache(
        currentManifest,
        descriptor,
        prepared.contract,
      );
      await writeAccountantPaymentReportArtifact(
        currentManifest,
        descriptor,
        prepared.contract,
      );

      const readyRecord = createAccountantPaymentReportReadinessRecord(
        hydrateAccountantPaymentReportManifest(currentManifest, {
          status: "ready",
          lastBuiltAt: nowIso(),
          lastSourceChangeAt: currentSourceChangeAt,
          lastSuccessfulArtifact: currentManifest.artifactPath,
        }),
      );
      await persistAccountantPaymentReportReadiness({
        scopeKey,
        paymentId,
        record: readyRecord,
      });
      recordPaymentReportReady({
        paymentId,
        startedAt,
        result: "success",
        cacheLayer: "rebuild",
        manifest: readyRecord.manifest,
      });
      return descriptor;
    })
    .catch(async (error) => {
      if (currentManifest) {
        const failedRecord = createAccountantPaymentReportReadinessRecord(
          hydrateAccountantPaymentReportManifest(currentManifest, {
            status: "failed",
            lastBuiltAt: previousReadiness?.manifest.lastBuiltAt ?? null,
            lastSourceChangeAt: currentSourceChangeAt,
            lastSuccessfulArtifact: getPreviousSuccessfulArtifact(previousReadiness),
          }),
          error instanceof Error ? error.message : String(error),
        );
        await persistAccountantPaymentReportReadiness({
          scopeKey,
          paymentId,
          record: failedRecord,
        });
      }
      throw error;
    })
    .finally(() => {
      if (accountantPaymentReportPdfInFlight.get(scopeKey) === task) {
        accountantPaymentReportPdfInFlight.delete(scopeKey);
      }
    });

  accountantPaymentReportPdfInFlight.set(scopeKey, task);
  return await task;
}

export function clearAccountantPaymentReportPdfDocumentCacheForTests() {
  accountantPaymentReportPdfArtifactCache.clear();
  accountantPaymentReportPdfReadinessCache.clear();
  accountantPaymentReportPdfInFlight.clear();
}
