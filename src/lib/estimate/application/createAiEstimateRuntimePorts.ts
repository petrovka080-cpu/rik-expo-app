import { createBuyerHandoffFromDraftRevision } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../../features/pdf/renderPdfFromDraftRevision";
import { buildAiEstimateCatalogIndex } from "../catalog/buildAiEstimateCatalogIndex";
import { searchAiEstimateCatalogIndex } from "../catalog/searchAiEstimateCatalogIndex";
import { classifyAiEstimateWork } from "../semantic/classifyAiEstimateWork";
import { createInMemoryAiEstimateLedgerPort } from "../adapters/inMemory/createInMemoryAiEstimateLedgerPort";
import type {
  AiEstimateBuyerPackagePort,
  AiEstimateCatalogPort,
  AiEstimateLedgerPort,
  AiEstimatePdfPort,
  AiEstimatePricebookPort,
  AiEstimateTelemetryPort,
} from "../ports";

export type AiEstimateRuntimePorts = {
  ledger: AiEstimateLedgerPort;
  catalog: AiEstimateCatalogPort;
  pricebook: AiEstimatePricebookPort;
  pdf: AiEstimatePdfPort;
  buyerPackage: AiEstimateBuyerPackagePort;
  telemetry: AiEstimateTelemetryPort;
};

export function createDefaultAiEstimateRuntimePorts(): AiEstimateRuntimePorts {
  return {
    ledger: createInMemoryAiEstimateLedgerPort(),
    catalog: {
      portKind: "estimate_catalog",
      buildIndex: () => buildAiEstimateCatalogIndex(),
      classifyWork: (input) => classifyAiEstimateWork(input),
      search: (query, limit) => searchAiEstimateCatalogIndex({ query, topK: limit }),
    },
    pricebook: {
      portKind: "estimate_pricebook",
      resolveRowPrice: (row) => ({
        rowId: row.rowId,
        unitPrice: row.unitPrice ?? null,
        currency: row.currency,
        sourceId: row.priceSourceId ?? row.sourceId ?? null,
        sourceLabel: row.priceSourceLabel ?? row.sourceLabel ?? null,
        priceStatus: row.priceStatus ?? null,
      }),
    },
    pdf: {
      portKind: "estimate_pdf",
      buildPdfSnapshot: (input) => renderPdfFromDraftRevision(input),
    },
    buyerPackage: {
      portKind: "estimate_buyer_package",
      buildBuyerPackage: (input) => {
        const result = createBuyerHandoffFromDraftRevision(input);
        return {
          revision: result.revision,
          snapshot: result.snapshot,
          buyerPackage: result.buyerHandoff,
        };
      },
    },
    telemetry: {
      portKind: "estimate_telemetry",
      emit: () => undefined,
    },
  };
}
