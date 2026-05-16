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
  approvedSupplierBundle: ProcurementReadySupplierProposalBundle | null;
  debugAiContext: boolean;
  scopedFacts: AssistantScopedFacts | null;
  scopedFactsError: string | null;
  scopedFactsLoading: boolean;
  onReadyProposalPress: (text: string) => void;
}) {
  const knowledgePreview = scopedFacts?.knowledgePreview ?? null;

  return (
    <>
      <View style={styles.productStatusCard}>
        <Text style={styles.productStatusText}>
          {resolvedUserContext.userFacingNotice
            ?? "Работаю в режиме подсказок и черновиков. Действия напрямую не выполняю."}
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
