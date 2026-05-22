import type { AiEstimatePdfAction, AiEstimatePdfSource } from "./estimatePdfTypes";

export class AiEstimatePdfGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiEstimatePdfGuardError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasEstimateRows(source: AiEstimatePdfSource): boolean {
  return source.estimate.sections.some((section) => section.rows.length > 0);
}

export function isAiEstimatePdfSource(value: unknown): value is AiEstimatePdfSource {
  if (!isRecord(value)) return false;
  const estimate = value.estimate;
  if (!isRecord(estimate)) return false;
  return (
    typeof value.title === "string" &&
    typeof value.language === "string" &&
    typeof value.locale === "string" &&
    typeof value.createdAt === "string" &&
    typeof estimate.workTitle === "string" &&
    Array.isArray(estimate.sections) &&
    Array.isArray(estimate.assumptions) &&
    Array.isArray(estimate.costIncreaseFactors) &&
    Array.isArray(estimate.clarifyingQuestions)
  );
}

export function assertAiEstimatePdfSource(value: unknown): asserts value is AiEstimatePdfSource {
  if (!isAiEstimatePdfSource(value)) {
    throw new AiEstimatePdfGuardError("AI estimate PDF requires a structured estimate payload.");
  }
  if (!value.title.trim()) {
    throw new AiEstimatePdfGuardError("AI estimate PDF title is empty.");
  }
  if (!value.estimate.workTitle.trim()) {
    throw new AiEstimatePdfGuardError("AI estimate PDF work title is empty.");
  }
  if (!value.estimate.sections.length || !hasEstimateRows(value)) {
    throw new AiEstimatePdfGuardError("AI estimate PDF requires sections with rows.");
  }
}

export function assertNoMarkdownEstimatePdfSource(value: unknown): void {
  if (typeof value === "string") {
    throw new AiEstimatePdfGuardError("Visible markdown is not a valid PDF source of truth.");
  }
}

export function shouldShowMakeEstimatePdfAction(source?: AiEstimatePdfSource | null): boolean {
  if (!source) return false;
  try {
    assertAiEstimatePdfSource(source);
    return true;
  } catch {
    return false;
  }
}

export function buildAiEstimatePdfActions(source?: AiEstimatePdfSource | null): AiEstimatePdfAction[] {
  if (!source) return [];
  try {
    assertAiEstimatePdfSource(source);
  } catch {
    return [];
  }
  const payloadRef = {
    estimateId: source.sourceId ?? source.title,
    sourceType: source.sourceType,
  };
  return [
    {
      id: "make_estimate_pdf",
      label: "Сделать PDF",
      visibleWhen: "message_has_estimate_payload",
      payloadRef,
    },
    {
      id: "save_estimate",
      label: "Сохранить в сметы",
      visibleWhen: "message_has_estimate_payload",
      payloadRef,
    },
    {
      id: "create_request",
      label: "Создать заявку",
      visibleWhen: "message_has_estimate_payload",
      payloadRef,
    },
    {
      id: "clarify_estimate",
      label: "Уточнить данные",
      visibleWhen: "message_has_estimate_payload",
      payloadRef,
    },
  ];
}

export function assertAiEstimatePdfDoesNotLeakOfficeData(source: AiEstimatePdfSource): void {
  const text = JSON.stringify(source).toLowerCase();
  const forbidden = ["warehouse", "finance", "company", "office", "service_role", "storagekey", "storage_key"];
  const hit = forbidden.find((token) => text.includes(token));
  if (hit) {
    throw new AiEstimatePdfGuardError(`AI estimate PDF source contains forbidden consumer leak token: ${hit}`);
  }
}
