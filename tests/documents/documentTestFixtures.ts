import {
  buildDocumentEvidenceProofInventory,
  buildDocumentEvidenceProofMatrix,
} from "../../src/lib/documents/evidenceIntelligence";

export function documentProof() {
  return buildDocumentEvidenceProofInventory();
}

export function documentMatrix() {
  return buildDocumentEvidenceProofMatrix();
}
