export const PROFESSIONAL_BOQ_MAIN_UI_PREVIEW_MAX_ROWS = 80;
export const PROFESSIONAL_BOQ_FORBIDDEN_GLOBAL_ROW_CAP = 45;

export type ProfessionalBoqRowCapSurface =
  | "calculator"
  | "snapshot"
  | "pdf"
  | "buyer_handoff"
  | "detail_drawer"
  | "export"
  | "main_ui_preview";

export type ProfessionalBoqDepthPolicy = {
  mainUiPreviewMaxRows: number;
  fullDataRowCapAllowed: false;
  allowedCappedSurface: "main_ui_preview";
};

export const PROFESSIONAL_BOQ_DEPTH_POLICY: ProfessionalBoqDepthPolicy = {
  mainUiPreviewMaxRows: PROFESSIONAL_BOQ_MAIN_UI_PREVIEW_MAX_ROWS,
  fullDataRowCapAllowed: false,
  allowedCappedSurface: "main_ui_preview",
};

const FORBIDDEN_ROW_CAP_RE =
  /\b(?:slice\s*\(\s*0\s*,\s*45\s*\)|MAX_ROWS\s*=\s*45|maxRows\s*:\s*45|limitRows\s*:\s*45|previewRows\s*:\s*45|mainUiRows\s*:\s*45)\b/;

export function isProfessionalBoqMainUiPreviewSurface(surface: ProfessionalBoqRowCapSurface): boolean {
  return surface === PROFESSIONAL_BOQ_DEPTH_POLICY.allowedCappedSurface;
}

export function detectForbiddenProfessionalBoqRowCapInText(text: string): boolean {
  return FORBIDDEN_ROW_CAP_RE.test(text);
}

export function assertProfessionalBoqFullDepthRows(input: {
  surface: ProfessionalBoqRowCapSurface;
  expectedRowsCount: number;
  actualRowsCount: number;
}): { passed: boolean; reason: string | null } {
  if (isProfessionalBoqMainUiPreviewSurface(input.surface)) {
    return { passed: true, reason: null };
  }
  if (input.actualRowsCount < input.expectedRowsCount) {
    return {
      passed: false,
      reason: `${input.surface}_rows_less_than_expected:${input.actualRowsCount}/${input.expectedRowsCount}`,
    };
  }
  return { passed: true, reason: null };
}
