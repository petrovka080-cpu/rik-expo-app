import { buildDocumentAppContextGraph } from "../adapters/documentAppContextGraphAdapter";
import { buildDocumentUniversalQaBridge } from "../adapters/documentUniversalQaBridge";
import { buildDocumentWorkflowBridge } from "../adapters/documentWorkflowBridge";
import { composeDocumentAiAnswer } from "../ai/documentAiAnswerComposer";
import { buildDocumentEvidenceMatrix } from "../ai/documentAiEvidenceMatrix";
import { extractDocumentAiFields } from "../ai/documentAiExtraction";
import { suggestDocumentLinks } from "../ai/documentAiLinkSuggestion";
import { detectDocumentMissingData } from "../ai/documentAiMissingDataDetector";
import { guardDocumentAiEvidence } from "../ai/documentAiSafetyGuard";
import { buildDocumentSignedUrlPolicy } from "../services/documentSignedUrlService";
import { ingestDocumentDraft } from "../services/documentIngestionService";
import { parseDocumentTextPages } from "../services/documentParserService";
import { chunkDocumentPages } from "../services/documentChunkingService";
import { extractDocumentFieldsFromText } from "../services/documentTextExtractionService";
import { createDocumentAssetSourceRef, createDocumentChunkSourceRef } from "../documentSourceRef";
import { DOCUMENT_EVIDENCE_WAVE, DOCUMENT_LIMITS } from "../documentLimits";

export function buildDocumentEvidenceProofInventory() {
  const now = "2026-05-21T00:00:00.000Z";
  const ingestion = ingestDocumentDraft({
    id: "pdf_invoice_45",
    orgId: "org-1",
    projectId: "project-1",
    ownerUserId: "accountant-1",
    ownerRole: "accountant",
    documentKind: "invoice",
    mimeType: "application/pdf",
    byteSize: 320_000,
    pageCount: 1,
    originalFileName: "invoice-45.pdf",
    paymentId: "payment_77",
    invoiceId: "invoice_45",
    requestId: "req_124",
    workId: "work_31",
    supplierId: "supplier_stroymat",
    companyId: "company_stroymat",
    createdAt: now,
  });
  if (!ingestion.document) {
    throw new Error("Document proof fixture failed ingestion validation.");
  }

  const document = {
    ...ingestion.document,
    aiStatus: "processed" as const,
    extractedDataStatus: "extracted_as_suggestion" as const,
  };
  const pages = parseDocumentTextPages({
    documentId: document.id,
    pages: [
      [
        "Счет №45",
        "Компания: ОсОО \"СтройМат\"",
        "Сумма: 125 000 KGS",
        "Товары: ГКЛ 12.5 мм, профиль",
        "Связь: платеж №77, заявка №124, работа ГКЛ перегородки",
      ].join("\n"),
    ],
  });
  const chunks = extractDocumentFieldsFromText(
    chunkDocumentPages({
      documentId: document.id,
      pages,
      createdAt: now,
    }),
  );
  const extraction = extractDocumentAiFields({ document, chunks, extractedAt: now });
  const documentSourceRef = createDocumentAssetSourceRef({
    document,
    labelRu: "PDF счета №45, страница 1",
  });
  const amountChunk = chunks.find((chunk) => chunk.id === extraction.fields.amount?.sourceChunkId) ?? chunks[0];
  const companyChunk = chunks.find((chunk) => chunk.id === extraction.fields.companyName?.sourceChunkId) ?? chunks[0];
  const numberChunk = chunks.find((chunk) => chunk.id === extraction.fields.documentNumber?.sourceChunkId) ?? chunks[0];
  const sourceRefs = [
    documentSourceRef,
    createDocumentChunkSourceRef({
      document,
      chunk: amountChunk,
      field: "amount",
      valuePreviewRu: "125 000 KGS",
    }),
    createDocumentChunkSourceRef({
      document,
      chunk: companyChunk,
      field: "company",
      valuePreviewRu: "ОсОО \"СтройМат\"",
    }),
    createDocumentChunkSourceRef({
      document,
      chunk: numberChunk,
      field: "document_number",
      valuePreviewRu: "45",
    }),
  ];
  const linkSuggestions = suggestDocumentLinks({ document, extraction });
  const evidenceMatrix = buildDocumentEvidenceMatrix({ document, sourceRefs, linkSuggestions });
  const missingData = detectDocumentMissingData({ document, linkSuggestions });
  const answer = composeDocumentAiAnswer({
    document,
    extraction,
    sourceRefs,
    linkSuggestions,
    evidenceMatrix,
    missingData,
  });
  const safety = guardDocumentAiEvidence({
    document,
    extraction,
    sourceRefs,
    linkSuggestions,
    answer,
  });
  const contextGraph = buildDocumentAppContextGraph({
    document,
    chunks,
    role: "accountant",
    screenId: "documents",
  });
  const universalQaBridge = buildDocumentUniversalQaBridge({ document, answer, sourceRefs });
  const workflowBridge = buildDocumentWorkflowBridge({ answer, evidenceMatrix });
  const signedUrlPolicy = buildDocumentSignedUrlPolicy({
    document,
    requesterUserId: "accountant-1",
    requesterRole: "accountant",
    orgId: "org-1",
  });

  return {
    wave: DOCUMENT_EVIDENCE_WAVE,
    limits: DOCUMENT_LIMITS,
    ingestion,
    document,
    pages,
    chunks,
    extraction,
    linkSuggestions,
    evidenceMatrix,
    missingData,
    sourceRefs,
    answer,
    safety,
    contextGraph: {
      sourceRefs: contextGraph.sourceRefs,
      documentSourceRefs: contextGraph.documentSourceRefs,
      providerTrace: contextGraph.providerTrace,
    },
    universalQaBridge,
    workflowBridge,
    signedUrlPolicy,
  };
}
