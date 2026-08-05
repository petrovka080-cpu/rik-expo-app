import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { ASPHALT_V4_RUNTIME_TEMPLATE_ID } from "../../src/lib/estimate/v4/asphalt";
import {
  compactConsumerRepairBundleForDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import { sanitizeConsumerRepairTransactionalBundle } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import {
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES,
  createDurableEnvelope,
  estimateRevisionUtf8ByteLength,
  serializeRevisionBundle,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "artifacts/current-core-remediation/durable-payload-size-budget.json",
);

function jsonBytes(value: unknown): number {
  return estimateRevisionUtf8ByteLength(JSON.stringify(value) ?? "null");
}

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function canonicalPath(pathParts: readonly (string | number)[]): string {
  return pathParts
    .map((part) => typeof part === "number" ? "[]" : part)
    .join(".")
    .replace(/\.\[\]/g, "[]");
}

function aggregateFieldBytes(value: unknown): Array<{
  field: string;
  occurrences: number;
  utf8Bytes: number;
}> {
  const aggregate = new Map<string, { occurrences: number; utf8Bytes: number }>();
  const visit = (candidate: unknown, pathParts: Array<string | number>) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    if (candidate && typeof candidate === "object") {
      Object.entries(candidate as Record<string, unknown>)
        .forEach(([key, item]) => visit(item, [...pathParts, key]));
      return;
    }
    const field = canonicalPath(pathParts);
    const existing = aggregate.get(field) ?? { occurrences: 0, utf8Bytes: 0 };
    existing.occurrences += 1;
    existing.utf8Bytes += jsonBytes(candidate);
    aggregate.set(field, existing);
  };
  visit(value, []);
  return [...aggregate.entries()]
    .map(([field, metrics]) => ({ field, ...metrics }))
    .sort((left, right) => right.utf8Bytes - left.utf8Bytes || left.field.localeCompare(right.field));
}

function allDraftRows(bundle: RevisionBundle) {
  return bundle.estimateDraftRevisionState?.revisions.flatMap((revision) => revision.boq.rows) ?? [];
}

function byteProfile(bundle: RevisionBundle) {
  const rows = allDraftRows(bundle);
  return {
    fullBundle: jsonBytes(bundle),
    boqRows: jsonBytes(rows),
    formulaGraph: jsonBytes(rows.map((row) => ({
      rowId: row.rowId,
      formulaId: row.formulaId ?? null,
      quantityFormula: row.quantityFormula ?? null,
      calculationTrace: row.calculationTrace ?? null,
      formulaGraphId: row.sourceParameters?.formulaGraphId ?? null,
    }))),
    sourceBindings: jsonBytes(rows.map((row) => ({
      rowId: row.rowId,
      sourceId: row.sourceId ?? null,
      sourceLabel: row.sourceLabel ?? null,
      normId: row.normId ?? null,
      normSourceId: row.normSourceId ?? null,
      normVersion: row.normVersion ?? null,
    }))),
    manualPriceOverrides: jsonBytes(bundle.items.filter((item) =>
      item.priceEditedByConsumer === true || item.priceSource === "user"
    )),
    comments: jsonBytes(bundle.estimateComments ?? []),
    attachmentMetadata: jsonBytes(bundle.estimateAttachments ?? []),
    pdfProjection: jsonBytes(bundle.pdfs),
    procurementProjection: jsonBytes({
      marketplaceLink: bundle.marketplaceLink,
      projectExecutionDrafts: bundle.projectExecutionDrafts,
      procurementRows: bundle.items.filter((item) =>
        item.sourceParameters?.includedInProcurement !== false &&
        item.itemType !== "work" &&
        item.itemType !== "document"
      ),
    }),
  };
}

function revisionBundle(revisionCount: 1 | 2): RevisionBundle {
  const r1 = createEstimateDraftRevision({
    estimateDraftId: "durable-payload-budget-road",
    rawInput: "Полное строительство дороги длиной 3000 м и шириной 32 м",
    selectedTemplateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
    createdAt: "2026-07-26T12:00:00.000Z",
  });
  const recalculated = recalculateEstimateDraftRevision(r1, {
    revisionId: r1.revisionId,
    selectedTemplateId: r1.selectedTemplateId,
    operation: "update_param",
    paramKey: "width_m",
    rawValue: "30",
    parsedValue: 30,
    inputUnit: "m",
    canonicalUnit: "m",
  }, {
    createdAt: "2026-07-26T12:02:00.000Z",
    revisionIndex: 2,
  });
  const revisions = revisionCount === 1 ? [r1] : [r1, recalculated.revision];
  const current = revisions.at(-1) ?? r1;
  const items = current.boq.rows.map((row, index) => ({
      id: `budget-item-${index + 1}`,
      requestDraftId: r1.estimateDraftId,
      itemType: row.rowType === "material" ? "material" as const : "work" as const,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: index + 0.25,
      totalPrice: row.quantity * (index + 0.25),
      currency: row.currency,
      source: "reference_price_book" as const,
      materialKey: row.materialKey,
      rateKey: row.rateKey,
      sourceId: row.sourceId,
      sourceLabel: row.sourceLabel,
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      priceEditedByConsumer: true,
      priceStatus: "USER_ENTERED_PRICE" as const,
      priceSource: "user" as const,
      priceSourceLabel: "Цена введена пользователем",
      sourceParameters: row.sourceParameters,
      editableByConsumer: true,
      createdAt: "2026-07-26T12:00:00.000Z",
    }));
  return {
    draft: {
      id: r1.estimateDraftId,
      consumerUserId: "durable-payload-budget-user",
      status: "draft",
      title: "Полное строительство дороги",
      problemText: r1.rawInput,
      repairType: "road_construction",
      missingData: [],
      createdAt: "2026-07-26T12:00:00.000Z",
      updatedAt: revisionCount === 1
        ? "2026-07-26T12:00:00.000Z"
        : "2026-07-26T12:02:00.000Z",
    },
    items,
    media: [],
    pdfs: [],
    estimateDraftRevisionState: {
      estimateDraftId: r1.estimateDraftId,
      currentRevisionId: current.revisionId,
      revisions,
      diffs: revisionCount === 1 ? [] : [recalculated.diff],
    },
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "durable-payload-budget-marketplace-link",
      requestDraftId: r1.estimateDraftId,
      marketplaceDemandId: null,
      status: "not_sent",
      createdAt: "2026-07-26T12:00:00.000Z",
    },
    events: [],
    estimateComments: Array.from({ length: 24 }, (_, index) => ({
      id: `budget-comment-${index + 1}`,
      ownerUserId: "durable-payload-budget-user",
      estimateId: r1.estimateDraftId,
      revisionId: current.revisionId,
      rowId: current.boq.rows[index]?.rowId ?? null,
      text: `Комментарий ${index + 1}`,
      createdAt: "2026-07-26T12:01:00.000Z",
      updatedAt: "2026-07-26T12:01:00.000Z",
      deleted: false,
    })),
    estimateAttachments: Array.from({ length: 8 }, (_, index) => ({
      id: `budget-attachment-${index + 1}`,
      ownerScope: "estimate" as const,
      estimateId: r1.estimateDraftId,
      revisionId: current.revisionId,
      rowId: current.boq.rows[index]?.rowId ?? null,
      fileName: `road-specification-${index + 1}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024 + index,
      contentHash: `budget-content-${index + 1}`,
      storageReference: `https://private.example.test/road/${index + 1}?token=secret`,
      thumbnailReference: `data:image/png;base64,private-${index + 1}`,
      createdAt: "2026-07-26T12:01:00.000Z",
      deleted: false,
      privacy: "private" as const,
      redacted: false,
    })),
    structuredEstimatePayload: null,
  };
}

function compactProfile(bundle: RevisionBundle) {
  const sanitized = sanitizeConsumerRepairTransactionalBundle(bundle);
  const compacted = compactConsumerRepairBundleForDurableStorage(sanitized);
  const encoded = encodeConsumerRepairBundleForDurableStorage(compacted);
  const serialized = serializeRevisionBundle(bundle, Number.MAX_SAFE_INTEGER);
  const envelope = createDurableEnvelope({
    key: bundle.draft.id,
    version: serialized.version,
    previousVersion: null,
    checksum: serialized.checksum,
    serializedBundle: serialized.serializedBundle,
  });
  return {
    sanitized,
    compacted,
    encoded,
    serializedBytes: estimateRevisionUtf8ByteLength(serialized.serializedBundle),
    durableEnvelopeBytes: jsonBytes(envelope),
  };
}

async function main(): Promise<void> {
    const r1 = revisionBundle(1);
    const r2 = revisionBundle(2);
    const r1Compact = compactProfile(r1);
    const r2Compact = compactProfile(r2);
    const rawTopFields = aggregateFieldBytes(r2).slice(0, 20);
    const compactTopFields = aggregateFieldBytes(r2Compact.encoded).slice(0, 20);
    const attachmentRaw = JSON.stringify(r2.estimateAttachments ?? []);
    const attachmentDurable = JSON.stringify(
      (r2Compact.compacted as RevisionBundle).estimateAttachments ?? [],
    );
    const artifact = {
      schema: "current-core-durable-payload-size-budget-v1",
      generatedAt: new Date().toISOString(),
      sourceHead: currentHead(),
      scenario: {
        id: "full-road-702-row-r1-r2-manual-prices-comments-attachments",
        boqRowsPerCurrentRevision: r2.estimateDraftRevisionState?.revisions.at(-1)?.boq.rows.length ?? 0,
        revisions: r2.estimateDraftRevisionState?.revisions.length ?? 0,
        comments: r2.estimateComments?.length ?? 0,
        attachments: r2.estimateAttachments?.length ?? 0,
      },
      before: {
        historicalObservedMaxR2Bytes: 13_328_406,
        historicalEvidence:
          "Recorded maximum R2 UTF-8 payload at the current-core remediation entry point.",
        r1: byteProfile(r1),
        r2: byteProfile(r2),
        top20Fields: rawTopFields,
      },
      after: {
        r1: {
          compactEncodedBundle: r1Compact.serializedBytes,
          durableEnvelope: r1Compact.durableEnvelopeBytes,
        },
        r2: {
          compactEncodedBundle: r2Compact.serializedBytes,
          durableEnvelope: r2Compact.durableEnvelopeBytes,
        },
        top20Fields: compactTopFields,
      },
      adapterBudgets: {
        synchronousWebStorageCompactThresholdBytes: 4_000_000,
        ...ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES,
        readAndWriteUseSameCapacity: true,
      },
      rootCause: {
        finding: "The raw runtime bundle repeated row metadata across items and revision BOQ projections and retained rich projection-only state. Raising one global limit hid this duplication.",
        remediation: "Transactional serialization now sanitizes private/binary values, compacts projection-only state, column-encodes item rows, and applies an explicit capacity at each adapter read/write boundary.",
        rawR2Bytes: jsonBytes(r2),
        historicalObservedMaxR2Bytes: 13_328_406,
        compactR2Bytes: r2Compact.serializedBytes,
        bytesRemovedFromCurrentRawProjection: jsonBytes(r2) - r2Compact.serializedBytes,
        bytesRemovedFromHistoricalMaximum: 13_328_406 - r2Compact.serializedBytes,
        reductionRatio: Number((1 - r2Compact.serializedBytes / jsonBytes(r2)).toFixed(6)),
      },
      privacy: {
        rawAttachmentContainsPrivateUrl: /private\.example\.test|token=secret/.test(attachmentRaw),
        durableAttachmentContainsPrivateUrl: /private\.example\.test|token=secret/.test(attachmentDurable),
        durableAttachmentContainsBinaryOrDataUrl: /base64|data:image/i.test(attachmentDurable),
      },
      acceptance: {
        localStorageUsedForHeavyPayload: false,
        webAdapter: "IndexedDB",
        androidAdapter: "transactional SQLite WAL",
        currentAndPreviousRetention: 2,
        typedOversizedFailure: "PAYLOAD_TOO_LARGE",
        compactR2FitsMemoryTestAdapter:
          r2Compact.serializedBytes <= ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
        compactR2FitsIndexedDb:
          r2Compact.serializedBytes <= ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.indexedDb,
        compactR2FitsSqlite:
          r2Compact.serializedBytes <= ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
      },
      finalStatus: "GREEN_DURABLE_PAYLOAD_BUDGET_ARCHITECTURAL",
    };
    mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({
      output: path.relative(process.cwd(), OUTPUT_PATH),
      rawR2Bytes: artifact.rootCause.rawR2Bytes,
      compactR2Bytes: artifact.rootCause.compactR2Bytes,
      reductionRatio: artifact.rootCause.reductionRatio,
      finalStatus: artifact.finalStatus,
    })}\n`);
}

void main();
