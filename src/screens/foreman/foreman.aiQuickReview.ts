import type {
  CandidateOption,
  CandidateOptionGroup,
  ClarifyQuestion,
  ForemanAiQuickItem,
} from "./foreman.ai";
import type { ForemanAiOutcomeType } from "./foremanUi.store";

export type ForemanAiQuickMode = "compose" | "review";
export type ForemanAiQuickSelectionMap = Record<string, string>;

export type ForemanAiQuickReviewGroup = CandidateOptionGroup & {
  groupId: string;
  selectedOption: CandidateOption | null;
};

const normalizeKeyPart = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё-]+/gi, "");

export const buildForemanAiQuickGroupId = (
  group: CandidateOptionGroup,
  index: number,
): string =>
  [
    "ai-review",
    index,
    normalizeKeyPart(group.sourceName),
    normalizeKeyPart(group.requestedQty),
    normalizeKeyPart(group.requestedUnit),
    normalizeKeyPart(group.kind),
  ].join(":");

export const buildForemanAiQuickReviewGroups = (
  groups: CandidateOptionGroup[],
  selectedChoicesByGroupId: ForemanAiQuickSelectionMap,
): ForemanAiQuickReviewGroup[] =>
  groups.map((group, index) => {
    const groupId = buildForemanAiQuickGroupId(group, index);
    const selectedCode = String(selectedChoicesByGroupId[groupId] || "").trim();
    return {
      ...group,
      groupId,
      selectedOption:
        group.options.find((option) => String(option.rik_code || "").trim() === selectedCode) ?? null,
    };
  });

export const buildForemanAiQuickAppliedItems = (params: {
  preview: ForemanAiQuickItem[];
  reviewGroups: ForemanAiQuickReviewGroup[];
}): ForemanAiQuickItem[] => {
  const selectedItems = params.reviewGroups
    .filter((group) => group.selectedOption)
    .map((group) => ({
      rik_code: group.selectedOption!.rik_code,
      name: group.selectedOption!.name,
      qty: group.requestedQty,
      unit: group.selectedOption!.unit || group.requestedUnit,
      kind: group.selectedOption!.kind || group.kind,
      specs: group.specs ?? null,
    }));

  return [...params.preview, ...selectedItems];
};

const hasBlockingQuestions = (questions: ClarifyQuestion[]): boolean =>
  Array.isArray(questions) && questions.length > 0;

const hasUnselectedReviewGroup = (reviewGroups: ForemanAiQuickReviewGroup[]): boolean =>
  reviewGroups.some((group) => !group.selectedOption);

export const canApplyForemanAiQuickReview = (params: {
  outcomeType: ForemanAiOutcomeType;
  preview: ForemanAiQuickItem[];
  reviewGroups: ForemanAiQuickReviewGroup[];
  questions: ClarifyQuestion[];
}): boolean => {
  if (params.outcomeType === "idle" || params.outcomeType === "ai_unavailable") return false;
  if (hasBlockingQuestions(params.questions)) return false;
  if (hasUnselectedReviewGroup(params.reviewGroups)) return false;
  return params.preview.length > 0 || params.reviewGroups.length > 0;
};
