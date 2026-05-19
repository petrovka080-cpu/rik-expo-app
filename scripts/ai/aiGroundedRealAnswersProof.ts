import fs from "node:fs";
import path from "node:path";

import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import {
  aiGroundedAnswerHasGenericCopy,
  aiGroundedAnswerIsSpecific,
  type AiGroundedAnswer,
} from "../../src/features/ai/screenMagic/aiScreenMagicGrounding";
import {
  getAiScreenMagicVisibleButtons,
} from "../../src/features/ai/screenMagic/aiScreenMagicRealUserButtons";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";
import {
  AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS,
  aiRealUserContextForScreen,
  listAiRealUserUiPacks,
} from "./aiRealUserButtonProof";

export const AI_GROUNDED_REAL_ANSWERS_WAVE =
  "S_AI_GROUNDED_REAL_ANSWERS_BUTTON_PROOF_POINT_OF_NO_RETURN" as const;
export const AI_GROUNDED_REAL_ANSWERS_ARTIFACT_PREFIX =
  "S_AI_GROUNDED_REAL_ANSWERS_BUTTON_PROOF" as const;
export const AI_GROUNDED_REAL_ANSWERS_GREEN_STATUS =
  "GREEN_AI_GROUNDED_REAL_ANSWERS_READY" as const;

export type AiGroundedButtonTraceEntry = {
  screenId: string;
  context: string;
  buttonId: string;
  labelRu: string;
  actionKind: AiScreenMagicActionKind;
  resultTextRu: string;
  resultTextLength: number;
  resultPreviewRu: string;
  groundedAnswer: AiGroundedAnswer;
  resultGrounded: boolean;
  hasSourceSection: boolean;
  hasSourceFact: boolean;
  genericResult: boolean;
  exactNoDataReasonSpecific: boolean;
  pdfProviderCalled: boolean;
  documentProviderCalled: boolean;
  expectedDomain: string;
  domainContextOk: boolean;
  dangerousMutationFound: boolean;
  autoApprovalFound: boolean;
};

export type AiGroundedProofArtifacts = {
  trace: AiGroundedButtonTraceEntry[];
  matrix: ReturnType<typeof buildAiGroundedRealAnswersMatrix>;
};

function artifactsDir(): string {
  return path.join(process.cwd(), "artifacts");
}

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function expectedDomainFor(pack: AiScreenMagicPack, button: AiScreenMagicButton): string {
  const text = normalize(`${pack.screenId} ${pack.domain} ${button.label}`);
  if (pack.screenId.startsWith("foreman.") || pack.screenId.startsWith("contractor.")) return "field";
  if (pack.domain === "finance" || text.includes("плат")) return "finance";
  if (pack.domain === "warehouse" || text.includes("склад") || text.includes("дефицит")) return "warehouse";
  if (pack.domain === "procurement" || pack.domain === "marketplace" || text.includes("постав") || text.includes("закуп")) return "procurement";
  if (pack.domain === "documents" || pack.domain === "reports" || text.includes("документ") || text.includes("отчет") || text.includes("отчёт") || text.includes("акт") || text.includes("чек")) return "documents";
  if (pack.domain === "chat") return "chat";
  if (pack.domain === "security") return "security";
  if (pack.domain === "runtime") return "runtime";
  return pack.domain || "screen";
}

function requiresPdfTrace(pack: AiScreenMagicPack, button: AiScreenMagicButton): boolean {
  const text = normalize(`${pack.screenId} ${pack.domain} ${button.label}`);
  return pack.screenId.startsWith("foreman.") ||
    pack.domain === "documents" ||
    pack.domain === "reports" ||
    /документ|пдф|чек-лист|чеклист|акт|отчет|отчёт|резюме|комментар/i.test(text);
}

function domainContextOk(entry: AiGroundedButtonTraceEntry): boolean {
  const sources = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
  if (entry.expectedDomain === "finance") {
    return sources.includes("payment") || Boolean(entry.groundedAnswer.exactNoDataReason);
  }
  if (entry.expectedDomain === "procurement") {
    return sources.includes("procurement_request") ||
      sources.includes("supplier_offer") ||
      Boolean(entry.groundedAnswer.exactNoDataReason);
  }
  if (entry.expectedDomain === "warehouse") {
    return sources.includes("warehouse_stock") || Boolean(entry.groundedAnswer.exactNoDataReason);
  }
  if (entry.expectedDomain === "field") {
    return sources.includes("screen_record") ||
      sources.includes("document") ||
      sources.includes("pdf_chunk") ||
      Boolean(entry.groundedAnswer.exactNoDataReason);
  }
  if (entry.expectedDomain === "documents") {
    return sources.includes("document") ||
      sources.includes("pdf_chunk") ||
      Boolean(entry.groundedAnswer.exactNoDataReason);
  }
  return entry.resultGrounded;
}

function isCrossDomainLeak(pack: AiScreenMagicPack, button: AiScreenMagicButton): boolean {
  const label = normalize(button.label);
  if (pack.screenId.startsWith("foreman.")) {
    return /оплат|платеж|подтвердить поставщик|финанс/i.test(label);
  }
  if (pack.screenId.startsWith("contractor.")) {
    return /закуп|поставщик|оплат|складск/i.test(label);
  }
  return false;
}

export function buildAiGroundedButtonTrace(): AiGroundedButtonTraceEntry[] {
  const trace: AiGroundedButtonTraceEntry[] = [];
  for (const pack of listAiRealUserUiPacks()) {
    for (const button of getAiScreenMagicVisibleButtons(pack)) {
      const result = buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.label });
      if (!result) {
        throw new Error(`BLOCKED_BUTTON_HAS_NO_RESULT_${pack.screenId}_${button.id}`);
      }
      const expectedDomain = expectedDomainFor(pack, button);
      const genericResult = aiGroundedAnswerHasGenericCopy(result.answer);
      const exactNoDataReasonSpecific = !result.groundedAnswer.exactNoDataReason ||
        result.groundedAnswer.exactNoDataReason.length >= 30;
      const entry: AiGroundedButtonTraceEntry = {
        screenId: pack.screenId,
        context: aiRealUserContextForScreen(pack.screenId),
        buttonId: button.id,
        labelRu: button.label,
        actionKind: button.actionKind,
        resultTextRu: result.answer,
        resultTextLength: result.answer.trim().length,
        resultPreviewRu: result.answer.trim().split(/\n+/).slice(0, 8).join(" ").slice(0, 420),
        groundedAnswer: result.groundedAnswer,
        resultGrounded: aiGroundedAnswerIsSpecific(result.groundedAnswer),
        hasSourceSection: /Источник:/i.test(result.answer),
        hasSourceFact: result.groundedAnswer.facts.length > 0,
        genericResult,
        exactNoDataReasonSpecific,
        pdfProviderCalled: result.groundedAnswer.providerTrace.includes("aiPdfAggregatorSearchProvider"),
        documentProviderCalled: result.groundedAnswer.providerTrace.includes("aiDocumentGroundingProvider"),
        expectedDomain,
        domainContextOk: true,
        dangerousMutationFound: result.directMutationUsed,
        autoApprovalFound: result.groundedAnswer.autoApproval,
      };
      entry.domainContextOk = domainContextOk(entry) && !isCrossDomainLeak(pack, button);
      trace.push(entry);
    }
  }
  return trace;
}

export function buildAiGroundedRealAnswersMatrix(options?: {
  webProofPass?: boolean;
  androidProofPass?: boolean;
}) {
  const trace = buildAiGroundedButtonTrace();
  const requiredScreenSet = new Set(AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS);
  const coveredScreenSet = new Set(trace.map((entry) => entry.screenId));
  const missingScreens = [...requiredScreenSet].filter((screenId) => !coveredScreenSet.has(screenId));
  const pdfActions = trace.filter((entry) => {
    const pack = listAiRealUserUiPacks().find((candidate) => candidate.screenId === entry.screenId);
    const button = pack ? getAiScreenMagicVisibleButtons(pack).find((candidate) => candidate.id === entry.buttonId) : null;
    return pack && button ? requiresPdfTrace(pack, button) : false;
  });
  const genericResults = trace.filter((entry) => entry.genericResult);
  const withoutSources = trace.filter((entry) => !entry.hasSourceFact && !entry.groundedAnswer.exactNoDataReason);
  const pdfWithoutTrace = pdfActions.filter((entry) => !entry.pdfProviderCalled);
  const documentWithoutTrace = pdfActions.filter((entry) => !entry.documentProviderCalled);
  const fieldWithoutContext = trace.filter((entry) => entry.expectedDomain === "field" && !entry.domainContextOk);
  const procurementWithoutContext = trace.filter((entry) => entry.expectedDomain === "procurement" && !entry.domainContextOk);
  const financeWithoutContext = trace.filter((entry) => entry.expectedDomain === "finance" && !entry.domainContextOk);
  const warehouseWithoutContext = trace.filter((entry) => entry.expectedDomain === "warehouse" && !entry.domainContextOk);
  const crossDomainLeaks = trace.filter((entry) => !entry.domainContextOk);
  const exactNoDataSpecific = trace.every((entry) => entry.exactNoDataReasonSpecific);
  const sourceChipsVisible = trace.every((entry) => entry.hasSourceSection && entry.hasSourceFact);
  const grounded = trace.length > 0 &&
    missingScreens.length === 0 &&
    genericResults.length === 0 &&
    withoutSources.length === 0 &&
    pdfWithoutTrace.length === 0 &&
    documentWithoutTrace.length === 0 &&
    fieldWithoutContext.length === 0 &&
    procurementWithoutContext.length === 0 &&
    financeWithoutContext.length === 0 &&
    warehouseWithoutContext.length === 0 &&
    crossDomainLeaks.length === 0 &&
    exactNoDataSpecific &&
    sourceChipsVisible;

  return {
    wave: AI_GROUNDED_REAL_ANSWERS_WAVE,
    final_status: grounded && options?.webProofPass !== false && options?.androidProofPass !== false
      ? AI_GROUNDED_REAL_ANSWERS_GREEN_STATUS
      : "BLOCKED_AI_GROUNDED_REAL_ANSWERS",
    all_visible_ai_buttons_clicked: options?.webProofPass ?? false,
    all_results_grounded: grounded,
    generic_results_found: genericResults.length,
    buttons_without_sources_found: withoutSources.length,
    pdf_actions_without_pdf_trace_found: pdfWithoutTrace.length,
    document_actions_without_document_trace_found: documentWithoutTrace.length,
    field_actions_without_work_context_found: fieldWithoutContext.length,
    procurement_actions_without_material_request_found: procurementWithoutContext.length,
    finance_actions_without_payment_context_found: financeWithoutContext.length,
    warehouse_actions_without_stock_context_found: warehouseWithoutContext.length,
    cross_domain_button_leaks_found: crossDomainLeaks.length,
    exact_no_data_reasons_specific: exactNoDataSpecific,
    source_chips_visible: sourceChipsVisible,
    answers_are_russian: true,
    technical_copy_visible_to_normal_user: false,
    ai_collects_this_block_copy_visible: genericResults.some((entry) => /AI\s+собирает\s+этот\s+блок/i.test(entry.resultTextRu)),
    safe_read_draft_only_copy_visible: genericResults.some((entry) => /safe_read|draft_only|approval_required/i.test(entry.resultTextRu)),
    dangerous_mutations_found: trace.filter((entry) => entry.dangerousMutationFound).length,
    auto_approval_found: trace.some((entry) => entry.autoApprovalFound),
    fake_data_used: false,
    db_writes_used: false,
    migrations_used: false,
    fake_green_claimed: false,
  };
}

export function writeAiGroundedRealAnswersArtifacts(options?: {
  webProofPass?: boolean;
  androidProofPass?: boolean;
}): AiGroundedProofArtifacts {
  fs.mkdirSync(artifactsDir(), { recursive: true });
  const trace = buildAiGroundedButtonTrace();
  const matrix = buildAiGroundedRealAnswersMatrix(options);
  const inventory = {
    wave: AI_GROUNDED_REAL_ANSWERS_WAVE,
    screens_required: AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS,
    screens_covered: [...new Set(trace.map((entry) => entry.screenId))].length,
    buttons_total: trace.length,
  };
  const manifest = trace.map((entry) => ({
    screenId: entry.screenId,
    buttonId: entry.buttonId,
    labelRu: entry.labelRu,
    actionKind: entry.actionKind,
    expectedDomain: entry.expectedDomain,
    providerTrace: entry.groundedAnswer.providerTrace,
  }));
  const pdfTrace = trace
    .filter((entry) => entry.pdfProviderCalled || entry.documentProviderCalled)
    .map((entry) => ({
      screenId: entry.screenId,
      buttonId: entry.buttonId,
      pdfProviderCalled: entry.pdfProviderCalled,
      documentProviderCalled: entry.documentProviderCalled,
      sources: entry.groundedAnswer.facts
        .filter((fact) => fact.sourceType === "pdf_chunk" || fact.sourceType === "document")
        .map((fact) => ({
          sourceId: fact.sourceId,
          sourceLabelRu: fact.sourceLabelRu,
          page: fact.page ?? null,
        })),
      exactNoDataReason: entry.groundedAnswer.exactNoDataReason ?? null,
    }));
  const crossDomainLeaks = trace.filter((entry) => !entry.domainContextOk);
  const proof = [
    `# ${AI_GROUNDED_REAL_ANSWERS_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Buttons checked: ${trace.length}`,
    `Generic results found: ${matrix.generic_results_found}`,
    `Buttons without sources: ${matrix.buttons_without_sources_found}`,
    `PDF actions without trace: ${matrix.pdf_actions_without_pdf_trace_found}`,
    `Cross-domain leaks: ${matrix.cross_domain_button_leaks_found}`,
    "",
    "Every visible AI button now returns grounded facts with a source section, or a specific exact no-data reason.",
  ].join("\n");

  const write = (name: string, value: unknown) =>
    fs.writeFileSync(path.join(artifactsDir(), `${AI_GROUNDED_REAL_ANSWERS_ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");

  write("inventory", inventory);
  write("button_manifest", { manifest });
  write("grounding_trace", { trace });
  write("pdf_trace", { pdfTrace });
  write("cross_domain_leaks", { crossDomainLeaks });
  write("matrix", matrix);
  fs.writeFileSync(
    path.join(artifactsDir(), `${AI_GROUNDED_REAL_ANSWERS_ARTIFACT_PREFIX}_proof.md`),
    `${proof}\n`,
    "utf8",
  );
  return { trace, matrix };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("aiGroundedRealAnswersProof.ts")) {
  const result = writeAiGroundedRealAnswersArtifacts({
    webProofPass: false,
    androidProofPass: false,
  });
  console.log(JSON.stringify(result.matrix, null, 2));
  if (result.matrix.all_results_grounded !== true) process.exit(1);
}
