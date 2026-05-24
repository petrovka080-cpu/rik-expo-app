export type EstimatePdfLayoutQuality =
  | "ENTERPRISE_TABULAR_DOCUMENT"
  | "BASIC_STRUCTURED_DOCUMENT"
  | "PLAIN_TEXT_DUMP"
  | "BROKEN_OR_UNREADABLE";

export type EstimatePdfLayoutEvidence = {
  documentHeader: boolean;
  documentNumberStatusDate: boolean;
  metadataBlock: boolean;
  realBorderedTable: boolean;
  tableHeader: boolean;
  rowGrid: boolean;
  totalsBlock: boolean;
  taxSourceBlock: boolean;
  footerSignatureBlock: boolean;
  readableWebViewerScreenshot: boolean;
  readableAndroidViewerScreenshot: boolean;
  textExtractable: boolean;
  plainTextPipeRows: boolean;
  visualRendererKind: "text_pdf" | "html_pdf" | "native_pdf" | "unknown";
};

export type EstimatePdfLayoutQualityReport = {
  classification: EstimatePdfLayoutQuality;
  enterpriseRequirementsMet: boolean;
  missingEnterpriseRequirements: (keyof EstimatePdfLayoutEvidence)[];
  evidence: EstimatePdfLayoutEvidence;
};

const ENTERPRISE_REQUIRED: (keyof EstimatePdfLayoutEvidence)[] = [
  "documentHeader",
  "documentNumberStatusDate",
  "metadataBlock",
  "realBorderedTable",
  "tableHeader",
  "rowGrid",
  "totalsBlock",
  "taxSourceBlock",
  "footerSignatureBlock",
  "readableWebViewerScreenshot",
  "readableAndroidViewerScreenshot",
];

export function detectEstimatePdfLayoutQuality(
  evidence: EstimatePdfLayoutEvidence,
): EstimatePdfLayoutQualityReport {
  const missingEnterpriseRequirements = ENTERPRISE_REQUIRED.filter((key) => evidence[key] !== true);
  const enterpriseRequirementsMet = missingEnterpriseRequirements.length === 0;

  if (!evidence.textExtractable) {
    return {
      classification: "BROKEN_OR_UNREADABLE",
      enterpriseRequirementsMet: false,
      missingEnterpriseRequirements,
      evidence,
    };
  }

  if (enterpriseRequirementsMet) {
    return {
      classification: "ENTERPRISE_TABULAR_DOCUMENT",
      enterpriseRequirementsMet: true,
      missingEnterpriseRequirements: [],
      evidence,
    };
  }

  if (
    evidence.documentHeader &&
    evidence.metadataBlock &&
    evidence.tableHeader &&
    evidence.totalsBlock &&
    evidence.taxSourceBlock &&
    !evidence.realBorderedTable &&
    evidence.plainTextPipeRows
  ) {
    return {
      classification: "PLAIN_TEXT_DUMP",
      enterpriseRequirementsMet: false,
      missingEnterpriseRequirements,
      evidence,
    };
  }

  if (evidence.documentHeader && evidence.metadataBlock && evidence.totalsBlock) {
    return {
      classification: "BASIC_STRUCTURED_DOCUMENT",
      enterpriseRequirementsMet: false,
      missingEnterpriseRequirements,
      evidence,
    };
  }

  return {
    classification: "BROKEN_OR_UNREADABLE",
    enterpriseRequirementsMet: false,
    missingEnterpriseRequirements,
    evidence,
  };
}
