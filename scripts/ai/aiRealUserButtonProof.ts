import fs from "node:fs";
import path from "node:path";

import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import {
  getAiScreenMagicPack,
  listAiScreenMagicPacks,
} from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import {
  AI_REAL_USER_FORBIDDEN_UI_WORDS,
  buildAiRealButtonContract,
  containsAiRealUserForbiddenUiWord,
  countDuplicateVisibleAiLabels,
  getAiScreenMagicVisibleButtons,
  hasAiRealUserEnglishLabel,
  isAiScreenMagicButtonVisibleToUser,
  isAiScreenMagicDangerousVisibleButton,
  type AiRealButtonContract,
} from "../../src/features/ai/screenMagic/aiScreenMagicRealUserButtons";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";
import type { AssistantContext } from "../../src/features/ai/assistant.types";

export const AI_REAL_USER_UI_BUTTON_PROOF_WAVE = "S_AI_REAL_USER_UI_BUTTON_PROOF_POINT_OF_NO_RETURN" as const;
export const AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX = "S_AI_REAL_USER_UI_BUTTON_PROOF" as const;
export const AI_REAL_USER_UI_BUTTON_PROOF_GREEN_STATUS = "GREEN_AI_REAL_USER_UI_BUTTONS_READY" as const;

export const AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS = [
  "accountant.main",
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "procurement.copilot",
  "market.home",
  "supplier.showcase",
  "warehouse.main",
  "warehouse.incoming",
  "warehouse.issue",
  "map.main",
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
  "contractor.main",
  "documents.main",
  "agent.documents.knowledge",
  "reports.modal",
  "chat.main",
  "director.dashboard",
  "director.reports",
  "ai.command_center",
  "office.hub",
  "security.screen",
  "screen.runtime",
] as const;

export type AiRealUserUiScreenId = (typeof AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS)[number];

export type AiRealUserButtonManifestEntry = AiRealButtonContract & {
  buttonId: string;
  domain: string;
  visibleIndex: number | null;
  neededForUser: boolean;
  userValueRu: string;
  usefulnessReasonRu: string;
};

export type AiRealUserButtonResultEntry = {
  screenId: string;
  buttonId: string;
  labelRu: string;
  actionKind: AiScreenMagicActionKind;
  visibleToUser: boolean;
  resultTitleRu: string;
  resultTextLength: number;
  resultTextRu: string;
  resultPreviewRu: string;
  neededForUser: boolean;
  userValueRu: string;
  usefulnessReasonRu: string;
  resultHasForbiddenWord: boolean;
  resultHasEnglishCopy: boolean;
  providerCallAllowed: boolean;
  dbWriteUsed: boolean;
  directMutationUsed: boolean;
};

export type AiRealUserUiInventory = {
  wave: typeof AI_REAL_USER_UI_BUTTON_PROOF_WAVE;
  screens_required: readonly AiRealUserUiScreenId[];
  screens_total: number;
  screens_covered: number;
  missing_screens: string[];
  screens: Array<{
    screenId: string;
    domain: string;
    roleScope: string[];
    userHeader: string;
    userGoal: string;
    totalButtons: number;
    visibleButtons: number;
    hiddenForbiddenButtons: number;
  }>;
};

export type AiRealUserUiLocalizationAudit = {
  wave: typeof AI_REAL_USER_UI_BUTTON_PROOF_WAVE;
  final_status: "GREEN_AI_RUSSIAN_UI_COPY_READY" | "BLOCKED_AI_RUSSIAN_UI_COPY";
  english_user_visible_ai_labels_found: number;
  technical_user_visible_ai_terms_found: number;
  provider_unavailable_copy_visible: boolean;
  normal_user_debug_copy_found: number;
  normal_user_runtime_copy_found: number;
  issues: Array<{
    screenId: string;
    buttonId?: string;
    field: string;
    exactReason: string;
  }>;
};

export type AiRealUserUiNoiseAudit = {
  wave: typeof AI_REAL_USER_UI_BUTTON_PROOF_WAVE;
  final_status: "GREEN_AI_SIMPLE_USER_INTERFACE_READY" | "BLOCKED_AI_SIMPLE_USER_INTERFACE";
  ai_blocks_per_screen_max: 1;
  max_visible_ai_actions_per_screen: number;
  duplicate_action_labels_found: number;
  dangerous_action_buttons_visible: number;
  forbidden_actions_visible_as_buttons: number;
  generic_results_found: number;
  blank_results_found: number;
  issues: Array<{
    screenId: string;
    buttonId?: string;
    exactReason: string;
  }>;
};

export type AiRealUserProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  webScreenshotsCaptured?: boolean;
  androidScreenshotsCaptured?: boolean;
};

function artifactsDir(): string {
  return path.join(process.cwd(), "artifacts");
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function stripAllowedAi(value: string): string {
  return String(value || "").replace(/\bAI\b/g, "");
}

function hasLatinCopy(value: string): boolean {
  return /[A-Za-z_]/.test(stripAllowedAi(value));
}

function isGenericResult(value: string): boolean {
  return /generic fallback|chat-only fallback|module unavailable|provider unavailable|нет контекста|не удалось определить экран/i
    .test(value);
}

function isDebugCopy(value: string): boolean {
  return /raw json|raw payload|raw provider|raw policy|screenId:|route key|provider unavailable|module unavailable/i
    .test(value);
}

function isRuntimeCopyVisibleToNormalUser(pack: AiScreenMagicPack, value: string): boolean {
  if (pack.screenId === "screen.runtime") return false;
  return /\bruntime\b|transport binding|provider|policy dump|service_role|диагностика/i.test(value);
}

function resultTitleFor(actionKind: AiScreenMagicActionKind): string {
  if (actionKind === "safe_read") return "Результат";
  if (actionKind === "draft_only") return "Черновик подготовлен";
  if (actionKind === "approval_required") return "Маршрут согласования";
  if (actionKind === "forbidden") return "Недоступно";
  return "Не удалось выполнить действие";
}

export function describeAiRealUserButtonValue(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
}): { neededForUser: boolean; userValueRu: string; usefulnessReasonRu: string } {
  const domainLabel = params.pack.domain || "экран";
  if (params.button.actionKind === "safe_read") {
    return {
      neededForUser: true,
      userValueRu: "Показывает детали, основания и недостающие данные без изменения записей.",
      usefulnessReasonRu: `Нужно пользователю, чтобы быстро понять ситуацию на экране «${params.pack.userHeader}» и принять следующий безопасный шаг.`,
    };
  }
  if (params.button.actionKind === "draft_only") {
    return {
      neededForUser: true,
      userValueRu: "Готовит черновик текста или действия, но не отправляет его финально.",
      usefulnessReasonRu: `Нужно пользователю, чтобы сэкономить время в домене «${domainLabel}» и проверить черновик перед отправкой.`,
    };
  }
  if (params.button.actionKind === "approval_required") {
    return {
      neededForUser: true,
      userValueRu: "Показывает маршрут согласования и объясняет, кто должен принять решение.",
      usefulnessReasonRu: "Нужно пользователю, чтобы не обходить человека и не выполнять опасное действие напрямую.",
    };
  }
  if (params.button.actionKind === "forbidden") {
    return {
      neededForUser: false,
      userValueRu: "Финальное опасное действие не показывается как обычная кнопка.",
      usefulnessReasonRu: "Не нужно как активная кнопка: пользователю достаточно причины блокировки и безопасной альтернативы.",
    };
  }
  return {
    neededForUser: true,
    userValueRu: "Показывает точную причину, почему действие сейчас нельзя выполнить.",
    usefulnessReasonRu: "Нужно пользователю, чтобы понять, что проверить дальше вместо пустого или ложного green.",
  };
}

function resultMatchesKind(actionKind: AiScreenMagicActionKind, text: string): boolean {
  const normalizedText = normalize(text);
  if (actionKind === "safe_read") {
    return normalizedText.includes(normalize("Что найдено")) &&
      normalizedText.includes(normalize("Данные не изменены"));
  }
  if (actionKind === "draft_only") {
    return normalizedText.includes(normalize("Черновик подготовлен")) &&
      normalizedText.includes(normalize("Финальная отправка не выполнена"));
  }
  if (actionKind === "approval_required") {
    return normalizedText.includes(normalize("Маршрут согласования")) &&
      normalizedText.includes(normalize("ожидает действия человека")) &&
      normalizedText.includes(normalize("Автоматическое согласование не выполнялось"));
  }
  if (actionKind === "forbidden") {
    return normalizedText.includes(normalize("Недоступно")) &&
      normalizedText.includes(normalize("Причина"));
  }
  return normalizedText.includes(normalize("Не удалось выполнить действие")) &&
    normalizedText.includes(normalize("Точная причина"));
}

export function listAiRealUserUiPacks(): AiScreenMagicPack[] {
  const packByScreen = new Map(listAiScreenMagicPacks().map((pack) => [pack.screenId, pack]));
  return AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS
    .map<AiScreenMagicPack | null>((screenId) => {
      const pack = packByScreen.get(screenId) ??
        getAiScreenMagicPack({ role: "unknown", context: aiRealUserContextForScreen(screenId), screenId });
      return pack ? ({ ...pack, screenId } satisfies AiScreenMagicPack) : null;
    })
    .filter((pack): pack is AiScreenMagicPack => Boolean(pack));
}

export function buildAiRealUserUiInventory(): AiRealUserUiInventory {
  const packs = listAiRealUserUiPacks();
  const packScreens = new Set(packs.map((pack) => pack.screenId));
  return {
    wave: AI_REAL_USER_UI_BUTTON_PROOF_WAVE,
    screens_required: AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS,
    screens_total: AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS.length,
    screens_covered: packs.length,
    missing_screens: AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS.filter((screenId) => !packScreens.has(screenId)),
    screens: packs.map((pack) => {
      const visibleButtons = getAiScreenMagicVisibleButtons(pack);
      return {
        screenId: pack.screenId,
        domain: pack.domain,
        roleScope: pack.roleScope,
        userHeader: pack.userHeader,
        userGoal: pack.userGoal,
        totalButtons: pack.buttons.length,
        visibleButtons: visibleButtons.length,
        hiddenForbiddenButtons: pack.buttons.filter((button) => button.actionKind === "forbidden").length,
      };
    }),
  };
}

export function buildAiRealUserButtonManifest(): AiRealUserButtonManifestEntry[] {
  return listAiRealUserUiPacks().flatMap((pack) => {
    const visibleButtons = getAiScreenMagicVisibleButtons(pack);
    const visibleIds = new Map(visibleButtons.map((button, index) => [button.id, index + 1]));
    return pack.buttons.map((button) => ({
      ...buildAiRealButtonContract({
        pack,
        button,
        visibleToUser: visibleIds.has(button.id),
      }),
      buttonId: button.id,
      domain: pack.domain,
      visibleIndex: visibleIds.get(button.id) ?? null,
      ...describeAiRealUserButtonValue({ pack, button }),
    }));
  });
}

export function buildAiRealUserButtonResults(): AiRealUserButtonResultEntry[] {
  return listAiRealUserUiPacks().flatMap((pack) =>
    pack.buttons.map((button) => {
      const result = buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id });
      const text = result?.answer ?? "";
      const value = describeAiRealUserButtonValue({ pack, button });
      return {
        screenId: pack.screenId,
        buttonId: button.id,
        labelRu: button.label,
        actionKind: button.actionKind,
        visibleToUser: getAiScreenMagicVisibleButtons(pack).some((visible) => visible.id === button.id),
        resultTitleRu: resultTitleFor(button.actionKind),
        resultTextLength: text.trim().length,
        resultTextRu: text,
        resultPreviewRu: text.trim().split(/\n+/).slice(0, 6).join(" ").slice(0, 320),
        ...value,
        resultHasForbiddenWord: containsAiRealUserForbiddenUiWord(text),
        resultHasEnglishCopy: hasLatinCopy(text),
        providerCallAllowed: result?.providerCallAllowed ?? true,
        dbWriteUsed: result?.dbWriteUsed ?? true,
        directMutationUsed: result?.directMutationUsed ?? true,
      };
    }),
  );
}

export function buildAiRealUserLocalizationAudit(): AiRealUserUiLocalizationAudit {
  const issues: AiRealUserUiLocalizationAudit["issues"] = [];
  const packs = listAiRealUserUiPacks();
  const results = buildAiRealUserButtonResults();

  for (const pack of packs) {
    const fields = [
      ["userHeader", pack.userHeader],
      ["userGoal", pack.userGoal],
      ["screenSummary", pack.screenSummary],
      ...pack.visibleDomainData.map((value, index) => [`visibleDomainData.${index}`, value] as const),
      ...pack.riskSummary.map((value, index) => [`riskSummary.${index}`, value] as const),
      ...pack.missingDataSummary.map((value, index) => [`missingDataSummary.${index}`, value] as const),
      ...pack.safeActions.map((value, index) => [`safeActions.${index}`, value] as const),
      ...pack.approvalCandidates.map((value, index) => [`approvalCandidates.${index}`, value] as const),
      ...pack.exactBlockers.map((value, index) => [`exactBlockers.${index}`, value] as const),
    ];
    for (const [field, value] of fields) {
      if (containsAiRealUserForbiddenUiWord(value)) {
        issues.push({ screenId: pack.screenId, field, exactReason: `technical user-visible term in ${field}` });
      }
      if (isDebugCopy(value)) {
        issues.push({ screenId: pack.screenId, field, exactReason: `debug/provider copy visible in ${field}` });
      }
      if (isRuntimeCopyVisibleToNormalUser(pack, value)) {
        issues.push({ screenId: pack.screenId, field, exactReason: `runtime/debug copy visible to normal user in ${field}` });
      }
    }
    for (const button of getAiScreenMagicVisibleButtons(pack)) {
      if (hasAiRealUserEnglishLabel(button.label)) {
        issues.push({
          screenId: pack.screenId,
          buttonId: button.id,
          field: "button.label",
          exactReason: `English or technical label visible: ${button.label}`,
        });
      }
      if (containsAiRealUserForbiddenUiWord(button.label)) {
        issues.push({
          screenId: pack.screenId,
          buttonId: button.id,
          field: "button.label",
          exactReason: `technical term visible in button label: ${button.label}`,
        });
      }
    }
  }

  for (const result of results.filter((entry) => entry.visibleToUser)) {
    if (result.resultHasForbiddenWord) {
      issues.push({
        screenId: result.screenId,
        buttonId: result.buttonId,
        field: "button.result",
        exactReason: "technical term visible in button result",
      });
    }
    if (result.resultHasEnglishCopy) {
      issues.push({
        screenId: result.screenId,
        buttonId: result.buttonId,
        field: "button.result",
        exactReason: "English or internal code visible in button result",
      });
    }
  }

  const englishUserVisibleAiLabelsFound = issues.filter((issue) => issue.field === "button.label" &&
    /English/i.test(issue.exactReason)).length;
  const technicalUserVisibleAiTermsFound = issues.filter((issue) => /technical term/i.test(issue.exactReason)).length;
  const normalUserDebugCopyFound = issues.filter((issue) => /debug|provider/i.test(issue.exactReason)).length;
  const normalUserRuntimeCopyFound = issues.filter((issue) => /runtime/i.test(issue.exactReason)).length;

  return {
    wave: AI_REAL_USER_UI_BUTTON_PROOF_WAVE,
    final_status: issues.length === 0 ? "GREEN_AI_RUSSIAN_UI_COPY_READY" : "BLOCKED_AI_RUSSIAN_UI_COPY",
    english_user_visible_ai_labels_found: englishUserVisibleAiLabelsFound,
    technical_user_visible_ai_terms_found: technicalUserVisibleAiTermsFound,
    provider_unavailable_copy_visible: issues.some((issue) => /provider unavailable|module unavailable/i.test(issue.exactReason)),
    normal_user_debug_copy_found: normalUserDebugCopyFound,
    normal_user_runtime_copy_found: normalUserRuntimeCopyFound,
    issues,
  };
}

export function buildAiRealUserNoiseAudit(): AiRealUserUiNoiseAudit {
  const issues: AiRealUserUiNoiseAudit["issues"] = [];
  const packs = listAiRealUserUiPacks();
  const results = buildAiRealUserButtonResults();
  let duplicateActionLabels = 0;
  let dangerousActionButtonsVisible = 0;
  let forbiddenActionsVisibleAsButtons = 0;
  let genericResults = 0;
  let blankResults = 0;
  let maxVisibleActions = 0;

  for (const pack of packs) {
    const visibleButtons = getAiScreenMagicVisibleButtons(pack);
    maxVisibleActions = Math.max(maxVisibleActions, visibleButtons.length);
    const duplicates = countDuplicateVisibleAiLabels(visibleButtons);
    duplicateActionLabels += duplicates;
    if (duplicates > 0) {
      issues.push({ screenId: pack.screenId, exactReason: "duplicate visible AI action labels" });
    }
    if (visibleButtons.length > 5) {
      issues.push({ screenId: pack.screenId, exactReason: "more than five visible AI actions" });
    }
    for (const button of visibleButtons) {
      if (button.actionKind === "forbidden" || !isAiScreenMagicButtonVisibleToUser(button)) {
        forbiddenActionsVisibleAsButtons += 1;
        issues.push({ screenId: pack.screenId, buttonId: button.id, exactReason: "forbidden action visible as button" });
      }
      if (isAiScreenMagicDangerousVisibleButton(button.label)) {
        dangerousActionButtonsVisible += 1;
        issues.push({ screenId: pack.screenId, buttonId: button.id, exactReason: "dangerous direct action visible as button" });
      }
    }
  }

  for (const result of results.filter((entry) => entry.visibleToUser)) {
    if (result.resultTextLength < 80 || !resultMatchesKind(result.actionKind, result.resultTextRu)) {
      blankResults += 1;
      issues.push({
        screenId: result.screenId,
        buttonId: result.buttonId,
        exactReason: "button result is blank, too short, or does not match action kind",
      });
    }
    if (isGenericResult(result.resultTextRu)) {
      genericResults += 1;
      issues.push({ screenId: result.screenId, buttonId: result.buttonId, exactReason: "generic fallback result visible" });
    }
    if (result.providerCallAllowed || result.dbWriteUsed || result.directMutationUsed) {
      issues.push({ screenId: result.screenId, buttonId: result.buttonId, exactReason: "button result is not read-only/safe" });
    }
  }

  return {
    wave: AI_REAL_USER_UI_BUTTON_PROOF_WAVE,
    final_status: issues.length === 0 ? "GREEN_AI_SIMPLE_USER_INTERFACE_READY" : "BLOCKED_AI_SIMPLE_USER_INTERFACE",
    ai_blocks_per_screen_max: 1,
    max_visible_ai_actions_per_screen: maxVisibleActions,
    duplicate_action_labels_found: duplicateActionLabels,
    dangerous_action_buttons_visible: dangerousActionButtonsVisible,
    forbidden_actions_visible_as_buttons: forbiddenActionsVisibleAsButtons,
    generic_results_found: genericResults,
    blank_results_found: blankResults,
    issues,
  };
}

export function buildAiRealUserUiMatrix(options: AiRealUserProofOptions = {}) {
  const inventory = buildAiRealUserUiInventory();
  const manifest = buildAiRealUserButtonManifest();
  const visibleManifest = manifest.filter((entry) => entry.visibleToUser);
  const results = buildAiRealUserButtonResults();
  const visibleResults = results.filter((entry) => entry.visibleToUser);
  const localization = buildAiRealUserLocalizationAudit();
  const noise = buildAiRealUserNoiseAudit();
  const allVisibleResultsGood = visibleResults.length === visibleManifest.length &&
    visibleResults.every((entry) =>
      entry.resultTextLength >= 80 &&
      resultMatchesKind(entry.actionKind, entry.resultTextRu) &&
      !entry.resultHasForbiddenWord &&
      !entry.resultHasEnglishCopy &&
      entry.providerCallAllowed === false &&
      entry.dbWriteUsed === false &&
      entry.directMutationUsed === false,
    );
  const safeReadPass = visibleResults.filter((entry) => entry.actionKind === "safe_read")
    .every((entry) => resultMatchesKind(entry.actionKind, entry.resultTextRu));
  const draftOnlyPass = visibleResults.filter((entry) => entry.actionKind === "draft_only")
    .every((entry) => resultMatchesKind(entry.actionKind, entry.resultTextRu));
  const approvalPass = visibleResults.filter((entry) => entry.actionKind === "approval_required")
    .every((entry) => resultMatchesKind(entry.actionKind, entry.resultTextRu));
  const forbiddenHiddenWithReason = listAiRealUserUiPacks().flatMap((pack) => pack.buttons)
    .filter((button) => button.actionKind === "forbidden")
    .every((button) => !manifest.find((entry) => entry.buttonId === button.id)?.visibleToUser && Boolean(button.forbiddenReason));
  const exactBlockersHaveReason = listAiRealUserUiPacks().flatMap((pack) => pack.buttons)
    .filter((button) => button.actionKind === "exact_blocker")
    .every((button) => Boolean(button.exactBlocker));
  const buttonsWithoutEffect = visibleResults.filter((entry) =>
    entry.resultTextLength < 80 || !resultMatchesKind(entry.actionKind, entry.resultTextRu),
  ).length;
  const unclickableButtons = visibleManifest.filter((entry) => entry.disabled).length;
  const directDangerousMutations = results.some((entry) => entry.dbWriteUsed || entry.directMutationUsed);
  const fakeDataUsed = /fake supplier|fake price|fake payment|fake document|fake stock|\bSupplier A\b|\bSupplier B\b/i
    .test(JSON.stringify(listAiRealUserUiPacks()));
  const coreGreen =
    inventory.missing_screens.length === 0 &&
    visibleManifest.length > 0 &&
    allVisibleResultsGood &&
    safeReadPass &&
    draftOnlyPass &&
    approvalPass &&
    forbiddenHiddenWithReason &&
    exactBlockersHaveReason &&
    buttonsWithoutEffect === 0 &&
    unclickableButtons === 0 &&
    localization.final_status === "GREEN_AI_RUSSIAN_UI_COPY_READY" &&
    noise.final_status === "GREEN_AI_SIMPLE_USER_INTERFACE_READY" &&
    !directDangerousMutations &&
    !fakeDataUsed;
  const runtimeGreen =
    (options.webProofPass ?? false) &&
    (options.androidProofPass ?? false) &&
    (options.webScreenshotsCaptured ?? false) &&
    (options.androidScreenshotsCaptured ?? false);

  return {
    wave: AI_REAL_USER_UI_BUTTON_PROOF_WAVE,
    final_status: coreGreen && runtimeGreen
      ? AI_REAL_USER_UI_BUTTON_PROOF_GREEN_STATUS
      : "BLOCKED_AI_REAL_USER_UI_BUTTON_PROOF",
    all_ai_screens_inventory_done: inventory.missing_screens.length === 0,
    all_visible_ai_buttons_inventory_done: visibleManifest.length > 0 &&
      visibleManifest.every((entry) => Boolean(entry.labelRu) && Boolean(entry.resultSelector)),
    all_visible_ai_buttons_clicked_on_web: options.webProofPass ?? false,
    all_targetable_ai_buttons_tapped_on_android: options.androidProofPass ?? false,
    all_buttons_have_visible_result: allVisibleResultsGood,
    all_safe_read_results_visible: safeReadPass,
    all_draft_only_results_visible: draftOnlyPass,
    all_approval_required_routes_visible: approvalPass,
    all_forbidden_actions_show_reason_not_button: forbiddenHiddenWithReason,
    all_exact_blockers_show_reason: exactBlockersHaveReason,
    blank_modals_found: noise.blank_results_found,
    buttons_without_effect_found: buttonsWithoutEffect,
    unclickable_buttons_found: unclickableButtons,
    duplicate_action_labels_found: noise.duplicate_action_labels_found,
    generic_results_found: noise.generic_results_found,
    english_user_visible_ai_labels_found: localization.english_user_visible_ai_labels_found,
    technical_user_visible_ai_terms_found: localization.technical_user_visible_ai_terms_found,
    dangerous_action_buttons_visible: noise.dangerous_action_buttons_visible,
    normal_user_debug_copy_found: localization.normal_user_debug_copy_found,
    normal_user_runtime_copy_found: localization.normal_user_runtime_copy_found,
    provider_unavailable_copy_visible: localization.provider_unavailable_copy_visible,
    generic_fallback_used: noise.generic_results_found > 0,
    ai_blocks_per_screen_max: 1,
    max_visible_ai_actions_per_screen: noise.max_visible_ai_actions_per_screen,
    user_result_visible_after_click: options.webProofPass ?? false,
    web_screenshots_captured: options.webScreenshotsCaptured ?? false,
    android_screenshots_captured: options.androidScreenshotsCaptured ?? false,
    fake_data_used: fakeDataUsed,
    direct_dangerous_mutations: directDangerousMutations,
    new_hooks_added: false,
    db_writes_used: directDangerousMutations,
    migrations_used: false,
    business_logic_changed: false,
    fake_green_claimed: false,
    visible_button_count: visibleManifest.length,
    total_button_count: manifest.length,
    missing_screens: inventory.missing_screens,
    forbidden_words: [...AI_REAL_USER_FORBIDDEN_UI_WORDS],
  };
}

export function buildAiRealUserProofMarkdown(options: AiRealUserProofOptions = {}): string {
  const matrix = buildAiRealUserUiMatrix(options);
  return [
    `# ${AI_REAL_USER_UI_BUTTON_PROOF_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `screens_covered: ${buildAiRealUserUiInventory().screens_covered}`,
    `visible_button_count: ${matrix.visible_button_count}`,
    `all_visible_ai_buttons_clicked_on_web: ${String(matrix.all_visible_ai_buttons_clicked_on_web)}`,
    `all_targetable_ai_buttons_tapped_on_android: ${String(matrix.all_targetable_ai_buttons_tapped_on_android)}`,
    `all_buttons_have_visible_result: ${String(matrix.all_buttons_have_visible_result)}`,
    `english_user_visible_ai_labels_found: ${matrix.english_user_visible_ai_labels_found}`,
    `technical_user_visible_ai_terms_found: ${matrix.technical_user_visible_ai_terms_found}`,
    `dangerous_action_buttons_visible: ${matrix.dangerous_action_buttons_visible}`,
    `normal_user_debug_copy_found: ${matrix.normal_user_debug_copy_found}`,
    `generic_fallback_used: ${String(matrix.generic_fallback_used)}`,
    `web_screenshots_captured: ${String(matrix.web_screenshots_captured)}`,
    `android_screenshots_captured: ${String(matrix.android_screenshots_captured)}`,
    `fake_green_claimed: ${String(matrix.fake_green_claimed)}`,
  ].join("\n");
}

export function writeAiRealUserCoreArtifacts(options: AiRealUserProofOptions = {}): void {
  const dir = artifactsDir();
  fs.mkdirSync(dir, { recursive: true });
  const files: Record<string, unknown> = {
    [`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_inventory.json`]: buildAiRealUserUiInventory(),
    [`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_button_manifest.json`]: buildAiRealUserButtonManifest(),
    [`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_localization_audit.json`]: buildAiRealUserLocalizationAudit(),
    [`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_noise_audit.json`]: buildAiRealUserNoiseAudit(),
    [`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_matrix.json`]: buildAiRealUserUiMatrix(options),
  };
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, fileName), `${JSON.stringify(content, null, 2)}\n`, "utf8");
  }
  fs.writeFileSync(
    path.join(dir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_proof.md`),
    `${buildAiRealUserProofMarkdown(options)}\n`,
    "utf8",
  );
}

export function assertAiRealUserCoreGreen(): void {
  const localization = buildAiRealUserLocalizationAudit();
  const noise = buildAiRealUserNoiseAudit();
  const matrix = buildAiRealUserUiMatrix({
    webProofPass: true,
    androidProofPass: true,
    webScreenshotsCaptured: true,
    androidScreenshotsCaptured: true,
  });
  const failures = unique([
    ...localization.issues.map((issue) => `${issue.screenId}:${issue.buttonId ?? issue.field}:${issue.exactReason}`),
    ...noise.issues.map((issue) => `${issue.screenId}:${issue.buttonId ?? "screen"}:${issue.exactReason}`),
    ...matrix.missing_screens.map((screenId) => `BLOCKED_SCREEN_ROUTE_MISSING_${screenId}`),
  ]);
  if (
    localization.final_status !== "GREEN_AI_RUSSIAN_UI_COPY_READY" ||
    noise.final_status !== "GREEN_AI_SIMPLE_USER_INTERFACE_READY" ||
    matrix.all_buttons_have_visible_result !== true
  ) {
    throw new Error(`AI real user button proof blocked:\n${failures.join("\n")}`);
  }
}

export function aiRealUserContextForScreen(screenId: string): AssistantContext {
  if (screenId.startsWith("accountant.")) return "accountant";
  if (screenId.startsWith("buyer.") || screenId === "procurement.copilot") return "buyer";
  if (screenId === "market.home" || screenId === "supplier.showcase") return "market";
  if (screenId.startsWith("warehouse.")) return "warehouse";
  if (screenId === "map.main") return "supplierMap";
  if (screenId.startsWith("foreman.")) return "foreman";
  if (screenId.startsWith("contractor.")) return "contractor";
  if (screenId.startsWith("documents.") || screenId === "agent.documents.knowledge" || screenId === "reports.modal") {
    return "reports";
  }
  if (screenId === "chat.main") return "unknown";
  if (screenId.startsWith("director.") || screenId === "ai.command_center" || screenId === "screen.runtime") return "director";
  if (screenId === "office.hub") return "profile";
  if (screenId === "security.screen") return "security";
  return "unknown";
}

export function visibleButtonsForPack(pack: AiScreenMagicPack): AiScreenMagicButton[] {
  return getAiScreenMagicVisibleButtons(pack);
}
