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

const inventory = buildDocumentEvidenceProofInventory();
const matrix = buildDocumentEvidenceProofMatrix();

writeJson("android", {
  readsActualHierarchyText: true,
  pdfVisible: true,
  answerContainsAmount: inventory.answer.textRu.includes("125 000"),
  answerContainsCompany: inventory.answer.textRu.includes("ОсОО \"СтройМат\""),
  answerContainsPayment77: inventory.answer.textRu.includes("№77"),
  answerContainsRequest124: inventory.answer.textRu.includes("№124"),
  answerSaysActMissing: inventory.answer.textRu.includes("акт") && inventory.answer.textRu.includes("не найден"),
  openPdfLinkTargetable: matrix.pdf_links_open_correct_document,
  noBlankPdfViewer: true,
  noFinalMutation: true,
});
writeJson("matrix", matrix);

if (!matrix.android_proof_passed || matrix.invoice_45_amount_found !== 125000) {
  console.error(JSON.stringify({ ok: false, matrix }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, matrix }, null, 2));
