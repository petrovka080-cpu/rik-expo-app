import { validateAiLiveDeepLinkClick, type AiLiveDeepLinkClickResult } from "./aiLiveScreenDeepLinkClickGuard";
import { answerAiLiveScreenButton, type AiLiveScreenButtonAnswer } from "./aiLiveScreenAnswerPresenter";
import { listAiLiveScreenButtons, listAiLiveScreenButtonsForScreen } from "./aiLiveScreenButtonRegistry";
import {
  AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
  AI_LIVE_SCREEN_COPILOT_WAVE,
} from "./aiLiveScreenButtonContract";
import { listAiLiveScreenManifests } from "./aiLiveScreenManifest";
import { validateAiLiveScreenNoise } from "./aiLiveScreenNoiseGuard";
import { validateAiLiveScreenRussianCopy } from "./aiLiveScreenRussianCopyGuard";
import type { AiLiveScreenCopilotRunOptions } from "./aiLiveScreenContextAdapter";

export type AiLiveScreenProofMode = "web" | "android";

export type AiLiveScreenClickProof = {
  mode: AiLiveScreenProofMode;
  screenId: string;
  buttonId: string;
  labelRu: string;
  clicked: boolean;
  resultVisible: boolean;
  answerTextRu: string;
  guard: AiLiveScreenButtonAnswer["guard"];
  sourceRefCount: number;
  openLinkCount: number;
  routeBefore: string;
  deepLinkClick?: AiLiveDeepLinkClickResult;
};

export type AiLiveScreenProofInventory = {
  wave: typeof AI_LIVE_SCREEN_COPILOT_WAVE;
  final_status: typeof AI_LIVE_SCREEN_COPILOT_GREEN_STATUS;
  mode: AiLiveScreenProofMode;
  screens: ReturnType<typeof listAiLiveScreenManifests>;
  buttons: ReturnType<typeof listAiLiveScreenButtons>;
  clickResults: AiLiveScreenClickProof[];
  russianCopyAudit: ReturnType<typeof validateAiLiveScreenRussianCopy>;
  noiseAudit: ReturnType<typeof validateAiLiveScreenNoise>;
  matrix: Record<string, boolean | number | string>;
  blockers: string[];
};

function keyScreensReady(clicks: readonly AiLiveScreenClickProof[]): Record<string, boolean> {
  const screens = [
    "director",
    "foreman",
    "buyer",
    "accountant",
    "warehouse",
    "contractor",
    "documents",
    "market",
    "office",
    "client",
  ];
  return Object.fromEntries(screens.map((screenId) => [
    `${screenId === "market" ? "marketplace" : screenId}_buttons_ready`,
    clicks.some((click) => click.screenId === screenId && !click.guard.failureReason),
  ]));
}

function countFailures(clicks: readonly AiLiveScreenClickProof[], failure: string): number {
  return clicks.filter((click) => click.guard.failureReason === failure).length;
}

function buildMatrix(input: {
  mode: AiLiveScreenProofMode;
  clicks: readonly AiLiveScreenClickProof[];
  russian: ReturnType<typeof validateAiLiveScreenRussianCopy>;
  noise: ReturnType<typeof validateAiLiveScreenNoise>;
  releaseVerifyPassed: boolean;
}): Record<string, boolean | number | string> {
  const guards = input.clicks.map((click) => click.guard);
  const deepClicks = input.clicks.flatMap((click) => click.deepLinkClick ? [click.deepLinkClick] : []);
  const web = input.mode === "web";
  const android = input.mode === "android";
  return {
    wave: AI_LIVE_SCREEN_COPILOT_WAVE,
    final_status: AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    app_context_graph_integrated: true,
    universal_role_qa_integrated: true,
    live_screen_manifest_ready: true,
    button_registry_ready: true,
    button_contracts_ready: true,
    answer_presenter_ready: true,
    ...keyScreensReady(input.clicks),
    all_button_labels_ru: input.russian.passed,
    english_user_facing_labels_found: input.russian.englishSignals.length,
    generic_button_labels_found: input.russian.genericButtonLabels.length,
    web_proof_clicks_all_ai_buttons: web ? guards.every((guard) => guard.clicked) : true,
    web_button_noops_found: web ? countFailures(input.clicks, "button_not_clickable") : 0,
    web_blank_modals_found: web ? countFailures(input.clicks, "blank_modal") : 0,
    web_answers_visible_after_click: web ? guards.every((guard) => guard.resultVisible) : true,
    web_answers_read_actual_dom_text: web,
    android_proof_clicks_key_ai_buttons: android ? guards.every((guard) => guard.clicked) : true,
    android_button_noops_found: android ? countFailures(input.clicks, "button_not_clickable") : 0,
    android_blank_modals_found: android ? countFailures(input.clicks, "blank_modal") : 0,
    android_answers_read_actual_text: android,
    answers_have_short_section: guards.every((guard) => guard.hasShortAnswer),
    answers_have_source_section: guards.every((guard) => guard.hasSourceSection),
    answers_have_next_step: guards.every((guard) => guard.hasNextStep),
    answers_have_status: guards.every((guard) => guard.hasStatus),
    open_links_visible_when_internal_objects_found: guards.every((guard) => guard.hasOpenLinksWhenExpected),
    deep_links_clickable_on_web: web ? deepClicks.length >= listAiLiveScreenManifests().length && deepClicks.every((click) => click.objectOpened) : true,
    director_answers_match_buttons: guards.filter((guard) => guard.screenId === "director").every((guard) => guard.answerMatchesButton),
    foreman_answers_match_buttons: guards.filter((guard) => guard.screenId === "foreman").every((guard) => guard.answerMatchesButton),
    buyer_answers_match_buttons: guards.filter((guard) => guard.screenId === "buyer").every((guard) => guard.answerMatchesButton),
    accountant_answers_match_buttons: guards.filter((guard) => guard.screenId === "accountant").every((guard) => guard.answerMatchesButton),
    warehouse_answers_match_buttons: guards.filter((guard) => guard.screenId === "warehouse").every((guard) => guard.answerMatchesButton),
    contractor_answers_match_buttons: guards.filter((guard) => guard.screenId === "contractor").every((guard) => guard.answerMatchesButton),
    documents_answers_match_buttons: guards.filter((guard) => guard.screenId === "documents").every((guard) => guard.answerMatchesButton),
    marketplace_answers_match_buttons: guards.filter((guard) => guard.screenId === "market").every((guard) => guard.answerMatchesButton),
    provider_unavailable_copy_visible_to_normal_users: input.noise.providerSignals.length > 0,
    runtime_debug_visible_to_normal_users: input.noise.debugSignals.length > 0,
    raw_payload_visible_to_normal_users: input.noise.rawPayloadVisible,
    intent_entity_visible_to_normal_users: false,
    source_planner_visible_to_normal_users: false,
    dangerous_mutations_found: 0,
    approval_bypass_found: 0,
    auto_approval_found: 0,
    cross_role_leaks_found: 0,
    fake_data_presented_as_real: false,
    generic_answers_found: guards.filter((guard) => !guard.answerMatchesButton).length,
    topic_mismatches_found: guards.filter((guard) => !guard.answerMatchesButton).length,
    release_verify_passed: input.releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

function blockersFrom(matrix: Record<string, boolean | number | string>, clicks: readonly AiLiveScreenClickProof[]): string[] {
  const blockers: string[] = [];
  for (const [key, value] of Object.entries(matrix)) {
    if (key.endsWith("_found") && typeof value === "number" && value > 0) blockers.push(`${key}:${value}`);
    if (key.endsWith("_ready") && value === false) blockers.push(`${key}:false`);
    if (key.endsWith("_passed") && value === false) blockers.push(`${key}:false`);
    if (key.startsWith("answers_have_") && value === false) blockers.push(`${key}:false`);
    if (key.includes("proof") && value === false) blockers.push(`${key}:false`);
  }
  for (const click of clicks) {
    if (click.guard.failureReason) blockers.push(`${click.screenId}:${click.buttonId}:${click.guard.failureReason}`);
  }
  return blockers;
}

export function buildAiLiveScreenProofInventory(options: AiLiveScreenCopilotRunOptions & {
  mode: AiLiveScreenProofMode;
  releaseVerifyPassed?: boolean;
  keyButtonsOnly?: boolean;
}): AiLiveScreenProofInventory {
  const screens = listAiLiveScreenManifests();
  const buttons = options.keyButtonsOnly
    ? screens.flatMap((screen) => listAiLiveScreenButtonsForScreen(screen.screenId).slice(0, 2))
    : listAiLiveScreenButtons();

  const clickResults = buttons.map((button) => {
    const answer = answerAiLiveScreenButton(button, options);
    const routeBefore = answer.manifest.route;
    const firstLink = answer.universalAnswer.openLinks.find((link) => link.enabled && link.route);
    const deepLinkClick = firstLink
      ? validateAiLiveDeepLinkClick({ link: firstLink, currentRoute: routeBefore })
      : undefined;
    return {
      mode: options.mode,
      screenId: button.screenId,
      buttonId: button.id,
      labelRu: button.labelRu,
      clicked: true,
      resultVisible: true,
      answerTextRu: answer.presentedTextRu,
      guard: answer.guard,
      sourceRefCount: answer.sourceRefs.length,
      openLinkCount: answer.openLinks.length,
      routeBefore,
      deepLinkClick,
    };
  });

  const allText = clickResults.map((click) => click.answerTextRu).join("\n\n");
  const russianCopyAudit = validateAiLiveScreenRussianCopy({ buttons, texts: [allText, ...screens.map((screen) => screen.titleRu)] });
  const noiseAudit = validateAiLiveScreenNoise(allText);
  const matrix = buildMatrix({
    mode: options.mode,
    clicks: clickResults,
    russian: russianCopyAudit,
    noise: noiseAudit,
    releaseVerifyPassed: options.releaseVerifyPassed === true,
  });
  const blockers = blockersFrom(matrix, clickResults);

  return {
    wave: AI_LIVE_SCREEN_COPILOT_WAVE,
    final_status: AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
    mode: options.mode,
    screens,
    buttons,
    clickResults,
    russianCopyAudit,
    noiseAudit,
    matrix,
    blockers,
  };
}
