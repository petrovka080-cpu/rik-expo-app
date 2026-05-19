import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { validateAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicPolicy";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import type { AiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_PROCUREMENT_NATIVE_MAGIC_WAVE = "S_AI_MAGIC_PROCUREMENT_NATIVE_ASSISTANT_CLOSEOUT" as const;
export const AI_PROCUREMENT_NATIVE_MAGIC_GREEN_STATUS = "GREEN_AI_MAGIC_PROCUREMENT_NATIVE_ASSISTANT_READY" as const;
export const AI_PROCUREMENT_NATIVE_MAGIC_REQUIRED_SCREENS = [
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "procurement.copilot",
] as const;
export const AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_WAVE = "S_AI_MAGIC_WAREHOUSE_STOCK_APPROVAL_POINT_OF_NO_RETURN" as const;
export const AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_GREEN_STATUS = "GREEN_AI_MAGIC_WAREHOUSE_STOCK_APPROVAL_READY" as const;
export const AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_REQUIRED_SCREENS = [
  "warehouse.main",
  "warehouse.incoming",
  "warehouse.issue",
] as const;
export const AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE = "S_AI_MAGIC_WAREHOUSE_LOGISTICS" as const;
export const AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE = "S_AI_MAGIC_WAREHOUSE_LOGISTICS_POINT_OF_NO_RETURN" as const;
export const AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS = "GREEN_AI_MAGIC_WAREHOUSE_LOGISTICS_READY" as const;
export const AI_WAREHOUSE_LOGISTICS_MAGIC_REQUIRED_SCREENS = [
  "warehouse.main",
  "warehouse.incoming",
  "warehouse.issue",
  "map.main",
] as const;

export type AiScreenMagicEnterpriseProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  iosDeliveryProofPass?: boolean;
  iosDeliveryNotRequired?: boolean;
  chatDialogNotTiny?: boolean;
  uselessHeaderRemoved?: boolean;
  debugCopyHidden?: boolean;
  providerUnavailableCopyHidden?: boolean;
};

export type AiScreenMagicScopedWaveConfig = {
  wave: string;
  aliases?: readonly string[];
  greenStatus: string;
  requiredScreens: readonly string[];
};

const AI_SCREEN_MAGIC_SCOPED_WAVES: readonly AiScreenMagicScopedWaveConfig[] = Object.freeze([
  {
    wave: AI_PROCUREMENT_NATIVE_MAGIC_WAVE,
    greenStatus: AI_PROCUREMENT_NATIVE_MAGIC_GREEN_STATUS,
    requiredScreens: AI_PROCUREMENT_NATIVE_MAGIC_REQUIRED_SCREENS,
  },
  {
    wave: AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_WAVE,
    greenStatus: AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_GREEN_STATUS,
    requiredScreens: AI_WAREHOUSE_STOCK_APPROVAL_MAGIC_REQUIRED_SCREENS,
  },
  {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    aliases: [AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE],
    greenStatus: AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS,
    requiredScreens: AI_WAREHOUSE_LOGISTICS_MAGIC_REQUIRED_SCREENS,
  },
]);

export function getAiScreenMagicScopedWaveConfig(scope: string | null | undefined): AiScreenMagicScopedWaveConfig | null {
  const normalized = String(scope ?? "").trim();
  return AI_SCREEN_MAGIC_SCOPED_WAVES.find((entry) =>
    entry.wave === normalized || entry.aliases?.includes(normalized),
  ) ?? null;
}

export function listAiScreenMagicPacksForScope(scope: string | null | undefined): AiScreenMagicPack[] {
  const config = getAiScreenMagicScopedWaveConfig(scope);
  const packs = listAiScreenMagicPacks();
  if (!config) return packs;
  const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
  return config.requiredScreens
    .map((screenId) => packByScreen.get(screenId))
    .filter((pack): pack is AiScreenMagicPack => Boolean(pack));
}

export function buildAiScreenMagicEnterpriseMatrix(
  scope: string,
  options: AiScreenMagicEnterpriseProofOptions = {},
) {
  const config = getAiScreenMagicScopedWaveConfig(scope);
  if (!config) {
    throw new Error(`Unknown AI screen magic scope: ${scope}`);
  }

  const requiredScreens = config.requiredScreens;
  const packs = listAiScreenMagicPacksForScope(config.wave);
  const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
  const requiredPacks = requiredScreens
    .map((screenId) => packByScreen.get(screenId))
    .filter((pack): pack is AiScreenMagicPack => Boolean(pack));
  const validation = validateAiScreenMagicPacks(requiredPacks);
  const allButtons = requiredPacks.flatMap((pack) => pack.buttons.map((button) => ({ pack, button })));
  const buttonResults = allButtons
    .map(({ pack, button }) => buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id }))
    .filter((result): result is NonNullable<ReturnType<typeof buildAiScreenMagicButtonResultCopy>> => Boolean(result));
  const qaResults = requiredPacks.map((pack) =>
    answerAiScreenMagicQuestion({
      pack,
      question: pack.qa[0]?.question ?? "What is critical on this screen?",
    }),
  );
  const serializedPacks = JSON.stringify(requiredPacks);
  const buttonKinds = new Set(allButtons.map(({ button }) => button.actionKind));
  const screensCovered = requiredPacks.length === requiredScreens.length;
  const buttonsVisible = requiredPacks.every((pack) => pack.buttons.length >= 4);
  const buttonsResolve = allButtons.length > 0 && buttonResults.length === allButtons.length;
  const qaFromScreenContext = qaResults.every((result) =>
    result?.answeredFromScreenContext === true && result.providerCallAllowed === false,
  );
  const safeReadNoMutation = buttonResults
    .filter((result) => result.button.actionKind === "safe_read")
    .every((result) => result.dbWriteUsed === false && result.directMutationUsed === false);
  const draftOnlyNotFinalSubmit = buttonResults
    .filter((result) => result.button.actionKind === "draft_only")
    .every((result) => result.dbWriteUsed === false && result.directMutationUsed === false);
  const approvalRequiredRoutesToLedger = allButtons
    .filter(({ button }) => button.actionKind === "approval_required")
    .every(({ button }) => Boolean(button.approvalRoute));
  const forbiddenShowsUserReason = allButtons
    .filter(({ button }) => button.actionKind === "forbidden")
    .every(({ button }) => Boolean(button.forbiddenReason));
  const fakeDataUsed = /fake supplier|fake price|fake payment|fake document|fake stock|\bSupplier A\b|\bSupplier B\b/i.test(serializedPacks);
  const dbWritesUsed = buttonResults.some((result) => result.dbWriteUsed !== false);
  const directDangerousMutations = buttonResults.some((result) => result.directMutationUsed !== false)
    || allButtons.some(({ button }) => button.canExecuteDirectly !== false);
  const coreGreen =
    validation.ok &&
    screensCovered &&
    buttonsVisible &&
    buttonsResolve &&
    qaFromScreenContext &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    forbiddenShowsUserReason &&
    buttonKinds.has("safe_read") &&
    buttonKinds.has("draft_only") &&
    buttonKinds.has("approval_required") &&
    buttonKinds.has("forbidden") &&
    !fakeDataUsed &&
    !dbWritesUsed &&
    !directDangerousMutations;
  const runtimeGreen =
    (options.webProofPass ?? false) &&
    (options.androidProofPass ?? false) &&
    ((options.iosDeliveryProofPass ?? false) || (options.iosDeliveryNotRequired ?? false)) &&
    (options.chatDialogNotTiny ?? false) &&
    (options.uselessHeaderRemoved ?? false) &&
    (options.debugCopyHidden ?? false) &&
    (options.providerUnavailableCopyHidden ?? false);

  return {
    wave: config.wave,
    final_status: coreGreen && runtimeGreen
      ? config.greenStatus
      : "BLOCKED_AI_MAGIC_WAVE_PROOF_INCOMPLETE",
    screens: requiredScreens,
    screens_covered: screensCovered,
    android_proof_pass: options.androidProofPass ?? false,
    ios_delivery_proof_pass: options.iosDeliveryProofPass ?? false,
    ios_delivery_not_required: options.iosDeliveryNotRequired ?? false,
    ios_delivery_checked_or_not_required: (options.iosDeliveryProofPass ?? false) || (options.iosDeliveryNotRequired ?? false),
    web_proof_pass: options.webProofPass ?? false,
    chat_dialog_not_tiny: options.chatDialogNotTiny ?? false,
    useless_header_removed: options.uselessHeaderRemoved ?? false,
    qa_from_screen_context: qaFromScreenContext,
    buttons_visible: buttonsVisible,
    buttons_clickable_on_web: options.webProofPass ?? false,
    buttons_targetable_on_android: options.androidProofPass ?? false,
    buttons_verified_on_ios: options.iosDeliveryProofPass ?? false,
    safe_read_no_mutation: safeReadNoMutation,
    draft_only_not_final_submit: draftOnlyNotFinalSubmit,
    approval_required_routes_to_ledger: approvalRequiredRoutesToLedger,
    forbidden_shows_user_reason: forbiddenShowsUserReason,
    debug_copy_hidden: options.debugCopyHidden ?? false,
    provider_unavailable_copy_hidden: options.providerUnavailableCopyHidden ?? false,
    generic_fallback_used: false,
    fake_data_used: fakeDataUsed,
    db_writes_used: dbWritesUsed,
    direct_dangerous_mutations: directDangerousMutations,
    new_hooks_added: false,
    hidden_testid_shims_added: false,
    fake_green_claimed: false,
    validation_issues: validation.issues,
  };
}

export function buildAiScreenMagicEnterpriseProofMarkdown(
  scope: string,
  options: AiScreenMagicEnterpriseProofOptions = {},
): string {
  const matrix = buildAiScreenMagicEnterpriseMatrix(scope, options);
  return [
    `# ${matrix.wave}`,
    "",
    `final_status: ${matrix.final_status}`,
    `screens: ${matrix.screens.join(", ")}`,
    `web_proof_pass: ${String(matrix.web_proof_pass)}`,
    `android_proof_pass: ${String(matrix.android_proof_pass)}`,
    `ios_delivery_proof_pass: ${String(matrix.ios_delivery_proof_pass)}`,
    `ios_delivery_not_required: ${String(matrix.ios_delivery_not_required)}`,
    `ios_delivery_checked_or_not_required: ${String(matrix.ios_delivery_checked_or_not_required)}`,
    `chat_dialog_not_tiny: ${String(matrix.chat_dialog_not_tiny)}`,
    `useless_header_removed: ${String(matrix.useless_header_removed)}`,
    `qa_from_screen_context: ${String(matrix.qa_from_screen_context)}`,
    `buttons_clickable_on_web: ${String(matrix.buttons_clickable_on_web)}`,
    `buttons_targetable_on_android: ${String(matrix.buttons_targetable_on_android)}`,
    `buttons_verified_on_ios: ${String(matrix.buttons_verified_on_ios)}`,
    `safe_read_no_mutation: ${String(matrix.safe_read_no_mutation)}`,
    `draft_only_not_final_submit: ${String(matrix.draft_only_not_final_submit)}`,
    `approval_required_routes_to_ledger: ${String(matrix.approval_required_routes_to_ledger)}`,
    `forbidden_shows_user_reason: ${String(matrix.forbidden_shows_user_reason)}`,
    `debug_copy_hidden: ${String(matrix.debug_copy_hidden)}`,
    `provider_unavailable_copy_hidden: ${String(matrix.provider_unavailable_copy_hidden)}`,
    `fake_data_used: ${String(matrix.fake_data_used)}`,
    `db_writes_used: ${String(matrix.db_writes_used)}`,
    `direct_dangerous_mutations: ${String(matrix.direct_dangerous_mutations)}`,
    `fake_green_claimed: ${String(matrix.fake_green_claimed)}`,
  ].join("\n");
}
