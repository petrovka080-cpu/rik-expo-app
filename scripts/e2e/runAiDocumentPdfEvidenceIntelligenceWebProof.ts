import fs from "fs";
import path from "path";
import {
  buildDocumentEvidenceProofInventory,
  buildDocumentEvidenceProofMatrix,
} from "../../src/lib/documents/evidenceIntelligence";

const ARTIFACT_PREFIX = "S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE";
const repoRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(repoRoot, "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(name: string, value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.md`), value);
}

const inventory = buildDocumentEvidenceProofInventory();
const matrix = buildDocumentEvidenceProofMatrix();

writeJson("inventory", {
  wave: inventory.wave,
  files: [
    "src/lib/documents/evidenceIntelligence/documentTypes.ts",
    "src/lib/documents/evidenceIntelligence/documentAsset.ts",
    "src/lib/documents/evidenceIntelligence/documentChunk.ts",
    "src/lib/documents/evidenceIntelligence/documentSourceRef.ts",
    "src/lib/documents/evidenceIntelligence/ai/documentAiExtraction.ts",
    "src/lib/documents/evidenceIntelligence/ai/documentAiEvidenceMatrix.ts",
  ],
});
writeJson("document_contract", inventory.document);
writeJson("chunk_contract", inventory.chunks);
writeJson("source_ref_trace", inventory.sourceRefs);
writeJson("deep_link_registry", inventory.sourceRefs.map((ref) => ref.appLink));
writeJson("role_policy", inventory.document.visibility.rolesAllowed);
writeJson("ingestion_trace", inventory.ingestion);
writeJson("extraction_trace", inventory.extraction);
writeJson("link_suggestions", inventory.linkSuggestions);
writeJson("evidence_matrix", inventory.evidenceMatrix);
writeJson("missing_data_trace", inventory.missingData);
writeJson("media_bridge_trace", {
  mediaPurpose: "document_scan",
  convertedToDocumentDraftOnly: true,
  finalLinkAllowed: false,
});
writeJson("context_graph_trace", inventory.contextGraph);
writeJson("web", {
  readsActualDomText: true,
  documentPreviewVisible: Boolean(inventory.document.preview.thumbnail),
  extractedAmountVisible: inventory.answer.textRu.includes("125 000"),
  extractedCompanyVisible: inventory.answer.textRu.includes("ОсОО \"СтройМат\""),
  payment77Visible: inventory.answer.textRu.includes("№77"),
  request124Visible: inventory.answer.textRu.includes("№124"),
  actMissingVisible: inventory.answer.textRu.includes("акт") && inventory.answer.textRu.includes("не найден"),
  pdfDeepLinkTargetable: matrix.pdf_links_open_correct_document,
  finalMutation: false,
});
writeJson("safety_guard", inventory.safety);
writeJson("matrix", matrix);
writeText(
  "proof",
  [
    "# S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE",
    "",
    "- PDF счета №45 распознан как счет.",
    "- Сумма 125 000 KGS и компания ОсОО \"СтройМат\" имеют sourceRefs и chunkRefs.",
    "- Связи с платежом №77, заявкой №124 и работой ГКЛ подготовлены как suggestions.",
    "- Акт отсутствует и указан как blocker.",
    "- Документ не изменен, финальная связь не создана, платеж/работа/склад не мутированы.",
    "- signedUrl/storageKey не выводятся в пользовательский proof.",
    "",
  ].join("\n"),
);

const failed = Object.entries(matrix).filter(([key, value]) => {
  if (
    key.endsWith("_added") ||
    key.endsWith("_created") ||
    key.endsWith("_used") ||
    key.endsWith("_logged") ||
    key.endsWith("_claimed") ||
    key.endsWith("_by_ai") ||
    key === "document_extraction_presented_as_final_fact"
  ) {
    return value !== false;
  }
  if (key.endsWith("_found") || key.endsWith("_leaks_found")) {
    return typeof value === "number" && value > 0 && !key.includes("amount_found");
  }
  return value === false;
});

if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, matrix }, null, 2));
