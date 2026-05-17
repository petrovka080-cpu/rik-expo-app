import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import type { AssistantScopedFacts } from "./assistantScopeContext";
import type { AssistantContext, AssistantQuickPrompt } from "./assistant.types";
import { getAssistantContextLabel } from "./assistantPrompts";
import type { AiAssistantResolvedUserContext } from "./assistantUx/aiAssistantContextResolver";
import {
  NO_INTERNAL_SUPPLIERS_MESSAGE,
  type ProcurementReadySupplierProposalBundle,
} from "./procurement/aiApprovedRequestSupplierOptions";
import type { ProcurementReadyBuyOptionBundle } from "./procurement/aiProcurementReadyBuyOptionTypes";
import { NO_READY_INTERNAL_BUY_OPTIONS_MESSAGE } from "./procurement/aiProcurementReadyBuyOptionTypes";
import type { AiRoleScreenAssistantPack } from "./realAssistants/aiRoleScreenAssistantTypes";
import { AI_ROLE_SCREEN_ASSISTANT_SAFE_STATUS_COPY } from "./realAssistants/aiRoleScreenAssistantUserCopy";
import type { AiScreenNativeAssistantPack } from "./screenNative/aiScreenNativeAssistantTypes";
import { buildAiScreenMagicPackFromWorkflowPack } from "./screenMagic/aiScreenMagicEngine";
import type { AiScreenWorkflowPack } from "./screenWorkflows/aiScreenWorkflowTypes";
import type { AiReadyProposal } from "./screenProposals/aiScreenReadyProposalTypes";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";

export function AIAssistantProductHeader({
  scopeLabel,
  onBack,
  onClear,
}: {
  scopeLabel: string;
  onBack: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerIconButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color="#0F172A" />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{`AI ассистент · ${scopeLabel}`}</Text>
        <Text style={styles.headerSubtitle}>
          Подсказки и черновики. Опасные действия — только через согласование.
        </Text>
      </View>

      <Pressable style={styles.headerIconButton} onPress={onClear}>
        <Ionicons name="refresh" size={18} color="#0F172A" />
      </Pressable>
    </View>
  );
}

export function AIAssistantReadyProductPanels({
  resolvedUserContext,
  readyProposals,
  screenNativeAssistantPack,
  screenWorkflowPack,
  roleScreenAssistantPack,
  readyBuyBundle,
  approvedSupplierBundle,
  debugAiContext,
  scopedFacts,
  scopedFactsError,
  scopedFactsLoading,
  onReadyProposalPress,
}: {
  resolvedUserContext: Pick<
    AiAssistantResolvedUserContext,
    "debugReason" | "userFacingNotice" | "userFacingScopeLabel"
  >;
  readyProposals: AiReadyProposal[];
  screenNativeAssistantPack: AiScreenNativeAssistantPack | null;
  screenWorkflowPack: AiScreenWorkflowPack | null;
  roleScreenAssistantPack: AiRoleScreenAssistantPack | null;
  readyBuyBundle: ProcurementReadyBuyOptionBundle | null;
  approvedSupplierBundle: ProcurementReadySupplierProposalBundle | null;
  debugAiContext: boolean;
  scopedFacts: AssistantScopedFacts | null;
  scopedFactsError: string | null;
  scopedFactsLoading: boolean;
  onReadyProposalPress: (text: string) => void;
}) {
  const knowledgePreview = scopedFacts?.knowledgePreview ?? null;
  const screenMagicPack = screenWorkflowPack
    ? buildAiScreenMagicPackFromWorkflowPack(screenWorkflowPack)
    : null;

  return (
    <>
      {screenNativeAssistantPack ? (
        <View style={styles.roleAssistantBlock} testID="ai.screen_native_value_pack">
          <View style={styles.roleAssistantHeaderRow}>
            <Text style={styles.roleAssistantEyebrow}>Готово от AI</Text>
            <Text style={styles.roleAssistantDomain}>{screenNativeAssistantPack.title}</Text>
          </View>
          <Text style={styles.roleAssistantSummary}>{screenNativeAssistantPack.summary}</Text>
          {screenNativeAssistantPack.today ? (
            <View style={styles.roleAssistantMetricRow}>
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{screenNativeAssistantPack.today.count ?? screenNativeAssistantPack.readyOptions.length}</Text>
                <Text style={styles.roleAssistantMetricLabel}>в срезе</Text>
              </View>
              {screenNativeAssistantPack.today.amountLabel ? (
                <View style={styles.roleAssistantMetric}>
                  <Text style={styles.roleAssistantMetricValue}>{screenNativeAssistantPack.today.amountLabel}</Text>
                  <Text style={styles.roleAssistantMetricLabel}>сумма</Text>
                </View>
              ) : null}
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{screenNativeAssistantPack.today.criticalCount ?? screenNativeAssistantPack.criticalItems.length}</Text>
                <Text style={styles.roleAssistantMetricLabel}>критич.</Text>
              </View>
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{screenNativeAssistantPack.today.pendingApprovalCount ?? screenNativeAssistantPack.nextActions.filter((action) => action.requiresApproval).length}</Text>
                <Text style={styles.roleAssistantMetricLabel}>approval</Text>
              </View>
            </View>
          ) : null}
          {screenNativeAssistantPack.criticalItems.length > 0 || screenNativeAssistantPack.readyOptions.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Критические пункты и варианты</Text>
              {screenNativeAssistantPack.criticalItems.slice(0, 2).map((item) => (
                <View key={item.id} style={styles.roleAssistantItem}>
                  <Text style={styles.roleAssistantItemTitle}>{item.title}</Text>
                  <Text style={styles.roleAssistantItemText}>{item.reason}</Text>
                </View>
              ))}
              {screenNativeAssistantPack.readyOptions.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.roleAssistantItem}>
                  <Text style={styles.roleAssistantItemTitle}>{item.title}</Text>
                  <Text style={styles.roleAssistantItemText}>{item.description}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {screenNativeAssistantPack.risks.length > 0 || screenNativeAssistantPack.missingData.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Риски и недостающие данные</Text>
              {screenNativeAssistantPack.risks.slice(0, 2).map((risk) => (
                <Text key={risk.id} style={styles.roleAssistantRiskText}>{`${risk.title}: ${risk.reason}`}</Text>
              ))}
              {screenNativeAssistantPack.missingData.slice(0, 2).map((item) => (
                <Text key={item.id} style={styles.roleAssistantRiskText}>{`Не хватает: ${item.label}`}</Text>
              ))}
            </View>
          ) : null}
          <ScrollView
            horizontal
            style={styles.roleAssistantActionScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleAssistantActionRow}
          >
            {screenNativeAssistantPack.nextActions.slice(0, 5).map((action) => (
              <Pressable
                key={action.id}
                style={styles.roleAssistantActionChip}
                onPress={() => onReadyProposalPress(action.label)}
                testID="ai.screen_native_value.action"
              >
                <Text style={styles.roleAssistantActionText}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {screenWorkflowPack ? (
        <View style={styles.roleAssistantBlock} testID="ai.screen_workflow_pack">
          <View style={styles.roleAssistantHeaderRow}>
            <Text style={styles.roleAssistantEyebrow}>Готово от AI</Text>
            <Text style={styles.roleAssistantDomain}>{screenMagicPack?.screenSummary ?? screenWorkflowPack.title}</Text>
          </View>
          <Text style={styles.roleAssistantSummary}>{screenMagicPack?.userGoal ?? screenWorkflowPack.userGoal}</Text>
          {screenMagicPack ? (
            <View testID="ai.screen_magic_pack">
              <View style={styles.roleAssistantSection}>
                <Text style={styles.roleAssistantSectionTitle}>Сегодня / Сейчас</Text>
                {screenMagicPack.aiPreparedWork.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.roleAssistantItem}>
                    <Text style={styles.roleAssistantItemTitle}>{item.title}</Text>
                    <Text style={styles.roleAssistantItemText}>{item.description}</Text>
                  </View>
                ))}
              </View>
              {screenMagicPack.aiPreparedWork.some((item) => item.missingData.length > 0) ? (
                <View style={styles.roleAssistantSection}>
                  <Text style={styles.roleAssistantSectionTitle}>Недостающие данные</Text>
                  {screenMagicPack.aiPreparedWork
                    .flatMap((item) => item.missingData)
                    .filter((value, index, values) => values.indexOf(value) === index)
                    .slice(0, 2)
                    .map((label) => (
                      <Text key={label} style={styles.roleAssistantRiskText}>{label}</Text>
                    ))}
                </View>
              ) : null}
              <ScrollView
                horizontal
                style={styles.roleAssistantActionScroller}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roleAssistantActionRow}
              >
                {screenMagicPack.buttons.slice(0, 6).map((button) => (
                  <Pressable
                    key={button.id}
                    style={styles.roleAssistantActionChip}
                    onPress={() => onReadyProposalPress(
                      button.actionKind === "forbidden" || button.actionKind === "exact_blocker"
                        ? `${button.label}: ${button.forbiddenReason ?? button.exactBlocker ?? "blocked"}`
                        : `${button.label}: ${button.expectedResult}`,
                    )}
                    testID="ai.screen_magic.action"
                  >
                    <Text style={styles.roleAssistantActionText}>{button.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {screenWorkflowPack.readyBlocks.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Prepared work</Text>
              {screenWorkflowPack.readyBlocks.slice(0, 2).map((block) => (
                <View key={block.id} style={styles.roleAssistantItem}>
                  <Text style={styles.roleAssistantItemTitle}>{block.title}</Text>
                  <Text style={styles.roleAssistantItemText}>{block.body}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {screenWorkflowPack.missingData.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Missing data / blockers</Text>
              {screenWorkflowPack.missingData.slice(0, 2).map((item) => (
                <Text key={item.id} style={styles.roleAssistantRiskText}>{item.label}</Text>
              ))}
            </View>
          ) : null}
          <ScrollView
            horizontal
            style={styles.roleAssistantActionScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleAssistantActionRow}
          >
            {screenWorkflowPack.actions.slice(0, 6).map((action) => (
              <Pressable
                key={action.id}
                style={styles.roleAssistantActionChip}
                onPress={() => onReadyProposalPress(
                  action.actionKind === "forbidden"
                    ? `${action.label}: ${action.forbiddenReason ?? action.exactBlocker ?? "forbidden"}`
                    : action.label,
                )}
                testID="ai.screen_workflow.action"
              >
                <Text style={styles.roleAssistantActionText}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {!screenNativeAssistantPack && roleScreenAssistantPack ? (
        <View style={styles.roleAssistantBlock} testID="ai.role_screen_assistant_pack">
          <View style={styles.roleAssistantHeaderRow}>
            <Text style={styles.roleAssistantEyebrow}>Готово от AI</Text>
            <Text style={styles.roleAssistantDomain}>{roleScreenAssistantPack.title}</Text>
          </View>
          <Text style={styles.roleAssistantSummary}>{roleScreenAssistantPack.summary}</Text>
          {roleScreenAssistantPack.today ? (
            <View style={styles.roleAssistantMetricRow}>
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{roleScreenAssistantPack.today.count}</Text>
                <Text style={styles.roleAssistantMetricLabel}>в срезе</Text>
              </View>
              {roleScreenAssistantPack.today.amountLabel ? (
                <View style={styles.roleAssistantMetric}>
                  <Text style={styles.roleAssistantMetricValue}>{roleScreenAssistantPack.today.amountLabel}</Text>
                  <Text style={styles.roleAssistantMetricLabel}>сумма</Text>
                </View>
              ) : null}
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{roleScreenAssistantPack.today.criticalCount ?? roleScreenAssistantPack.risks.length}</Text>
                <Text style={styles.roleAssistantMetricLabel}>критич.</Text>
              </View>
              <View style={styles.roleAssistantMetric}>
                <Text style={styles.roleAssistantMetricValue}>{roleScreenAssistantPack.today.overdueCount ?? roleScreenAssistantPack.missingData.length}</Text>
                <Text style={styles.roleAssistantMetricLabel}>требуют</Text>
              </View>
            </View>
          ) : null}
          {roleScreenAssistantPack.readyItems.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Самое важное</Text>
              {roleScreenAssistantPack.readyItems.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.roleAssistantItem}>
                  <Text style={styles.roleAssistantItemTitle}>{item.title}</Text>
                  <Text style={styles.roleAssistantItemText}>{item.description}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {roleScreenAssistantPack.risks.length > 0 || roleScreenAssistantPack.missingData.length > 0 ? (
            <View style={styles.roleAssistantSection}>
              <Text style={styles.roleAssistantSectionTitle}>Риски и недостающие данные</Text>
              {roleScreenAssistantPack.risks.slice(0, 2).map((risk) => (
                <Text key={risk.id} style={styles.roleAssistantRiskText}>{`${risk.title}: ${risk.reason}`}</Text>
              ))}
              {roleScreenAssistantPack.missingData.slice(0, 2).map((item) => (
                <Text key={item.id} style={styles.roleAssistantRiskText}>{`Не хватает: ${item.label}`}</Text>
              ))}
            </View>
          ) : null}
          <ScrollView
            horizontal
            style={styles.roleAssistantActionScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleAssistantActionRow}
          >
            {roleScreenAssistantPack.nextActions.slice(0, 5).map((action) => (
              <Pressable
                key={action.id}
                style={styles.roleAssistantActionChip}
                onPress={() => onReadyProposalPress(action.label)}
                testID="ai.role_screen_assistant.action"
              >
                <Text style={styles.roleAssistantActionText}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.productStatusCard}>
        <Text style={styles.productStatusText}>
          {resolvedUserContext.userFacingNotice
            ?? AI_ROLE_SCREEN_ASSISTANT_SAFE_STATUS_COPY}
        </Text>
      </View>

      {readyProposals.length > 0 ? (
        <View style={styles.readyProposalBlock} testID="ai.ready_proposals">
          <Text style={styles.readyProposalTitle}>Готовые предложения</Text>
          <ScrollView
            horizontal
            style={styles.readyProposalScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.readyProposalRow}
          >
            {readyProposals.map((proposal) => (
              <Pressable
                key={proposal.id}
                style={styles.readyProposalChip}
                onPress={() => onReadyProposalPress(proposal.primaryActionLabel ?? proposal.title)}
                testID="ai.ready_proposal.chip"
              >
                <Text style={styles.readyProposalChipText}>
                  {proposal.primaryActionLabel ?? proposal.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {readyBuyBundle ? (
        <View style={styles.supplierProposalBlock} testID="ai.buyer_ready_buy_options">
          <Text style={styles.readyProposalTitle}>Готовые варианты закупки</Text>
          {readyBuyBundle.options.length > 0 ? (
            readyBuyBundle.options.slice(0, 3).map((option, index) => (
              <View key={option.id} style={styles.supplierOptionCard}>
                <Text style={styles.supplierOptionTitle}>{`${index + 1}. ${option.supplierName}`}</Text>
                <Text style={styles.supplierOptionText}>
                  {`Покрывает: ${option.coverageLabel}`}
                </Text>
                {option.priceSignal || option.deliverySignal || option.reliabilitySignal ? (
                  <Text style={styles.supplierOptionMeta}>
                    {[option.priceSignal, option.deliverySignal, option.reliabilitySignal].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                <Text style={styles.supplierOptionMeta}>
                  {`Риски: ${option.risks.join(", ") || "нет отмеченных рисков"}`}
                </Text>
                <Text style={styles.supplierOptionMeta}>
                  {`Не хватает: ${option.missingData.join(", ") || "нет"}`}
                </Text>
                <Text style={styles.supplierOptionMeta}>
                  {`Следующий шаг: ${option.recommendedAction}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.supplierOptionText}>{NO_READY_INTERNAL_BUY_OPTIONS_MESSAGE}</Text>
          )}
        </View>
      ) : null}

      {approvedSupplierBundle ? (
        <View style={styles.supplierProposalBlock} testID="ai.approved_request_supplier_options">
          <Text style={styles.readyProposalTitle}>Готовые варианты по утверждённой заявке</Text>
          {approvedSupplierBundle.supplierOptions.length > 0 ? (
            approvedSupplierBundle.supplierOptions.slice(0, 3).map((option, index) => (
              <View key={`${option.source}:${option.supplierName}:${index}`} style={styles.supplierOptionCard}>
                <Text style={styles.supplierOptionTitle}>{`${index + 1}. ${option.supplierName}`}</Text>
                <Text style={styles.supplierOptionText}>
                  {`Покрывает: ${option.matchedItems.join(", ") || "требуется уточнение"}`}
                </Text>
                {option.priceSignal || option.deliverySignal ? (
                  <Text style={styles.supplierOptionMeta}>
                    {[option.priceSignal, option.deliverySignal].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                <Text style={styles.supplierOptionMeta}>
                  {`Риски: ${option.risks.join(", ") || "нет отмеченных рисков"}`}
                </Text>
                <Text style={styles.supplierOptionMeta}>
                  {`Не хватает: ${option.missingData.join(", ") || "нет"}`}
                </Text>
                <Text style={styles.supplierOptionMeta}>
                  {`Следующий шаг: ${option.recommendedNextAction}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.supplierOptionText}>{NO_INTERNAL_SUPPLIERS_MESSAGE}</Text>
          )}
        </View>
      ) : null}

      {debugAiContext && (scopedFactsLoading || scopedFacts || scopedFactsError) ? (
        <View
          style={styles.scopeCard}
          testID={knowledgePreview ? "ai.knowledge.preview" : undefined}
          accessibilityLabel={knowledgePreview ? "AI knowledge preview" : undefined}
        >
          <View style={styles.scopeCardHeader}>
            <Text style={styles.scopeCardTitle}>Data-aware context</Text>
            {scopedFactsLoading ? <ActivityIndicator size="small" color="#2563EB" /> : null}
          </View>
          <Text style={styles.scopeCardMeta} numberOfLines={2}>{resolvedUserContext.debugReason}</Text>
          {knowledgePreview ? (
            <>
              <Text style={styles.scopeCardText} numberOfLines={1} testID="ai.knowledge.role" accessibilityLabel={`AI role ${knowledgePreview.role}`}>{`role: ${knowledgePreview.role}`}</Text>
              <Text style={styles.scopeCardMeta} numberOfLines={1} testID="ai.knowledge.screen" accessibilityLabel={`AI screen ${knowledgePreview.screenId}`}>{`screen: ${knowledgePreview.screenId} | policy: ${knowledgePreview.contextPolicy}`}</Text>
              <Text style={styles.scopeCardMeta} numberOfLines={2} testID="ai.knowledge.domain" accessibilityLabel={`AI domain ${knowledgePreview.domain}`}>{`domain: ${knowledgePreview.domain} | entities: ${knowledgePreview.allowedEntities.join(", ") || "none"} | documents: ${knowledgePreview.documentSources.join(", ") || "none"}`}</Text>
              <Text style={styles.scopeCardMeta} numberOfLines={2} testID="ai.knowledge.allowed-intents" accessibilityLabel="AI allowed intents">{`allowedIntents: ${knowledgePreview.allowedIntents.join(", ") || "none"}`}</Text>
              <Text style={styles.scopeCardMeta} numberOfLines={1} testID="ai.knowledge.blocked-intents" accessibilityLabel="AI blocked intents">{`blockedIntents: ${knowledgePreview.blockedIntents.join(", ") || "none"}`}</Text>
              <Text style={styles.scopeCardMeta} numberOfLines={2} testID="ai.knowledge.approval-boundary" accessibilityLabel="AI approval boundary">{`approval_required: ${knowledgePreview.approvalBoundary}`}</Text>
            </>
          ) : null}
          {!scopedFacts && scopedFactsError ? (
            <Text style={styles.scopeCardError}>{`Контекст не загружен: ${scopedFactsError}`}</Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

export function AIAssistantShortcutRows({
  assistantContext,
  quickPrompts,
  onPromptPress,
}: {
  assistantContext: AssistantContext;
  quickPrompts: AssistantQuickPrompt[];
  onPromptPress: (prompt: string) => void;
}) {
  return (
    <>
      <ScrollView
        horizontal
        style={styles.routeScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.routeRow}
      >
        {assistantContext !== "unknown" ? (
          <View style={styles.routeChip}>
            <Text style={styles.routeChipText}>{getAssistantContextLabel(assistantContext)}</Text>
          </View>
        ) : null}
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/market")}>
          <Text style={styles.routeChipText}>Маркет</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/supplierShowcase")}>
          <Text style={styles.routeChipText}>Витрина</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/supplierMap")}>
          <Text style={styles.routeChipText}>Карта</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/auctions")}>
          <Text style={styles.routeChipText}>Торги</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.routeChipText}>Профиль</Text>
        </Pressable>
      </ScrollView>

      <ScrollView
        horizontal
        style={styles.quickPromptScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickPromptRow}
      >
        {quickPrompts.map((prompt) => (
          <Pressable key={prompt.id} style={styles.quickPromptChip} onPress={() => onPromptPress(prompt.prompt)}>
            <Text style={styles.quickPromptText}>{prompt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
