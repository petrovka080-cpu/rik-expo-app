import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AiCommandCenterSection } from "./AiCommandCenterCards";
import {
  useAiCommandCenterData,
  type UseAiCommandCenterDataParams,
} from "./useAiCommandCenterData";
import type {
  AiCommandCenterActionView,
  AiCommandCenterCardView,
} from "./AiCommandCenterTypes";
import { buildAiScreenActionPreviewSummary } from "../screenActions/aiScreenActionResolver";
import { buildConstructionKnowhowPreviewCard } from "../constructionKnowhow/constructionDecisionCardEngine";
import { toConstructionKnowhowRoleId } from "../constructionKnowhow/constructionRoleAdvisor";
import { styles } from "./AiCommandCenterScreen.styles";

type ActionPanel = {
  title: string;
  body: string;
  mutationCount: 0;
  executed: false;
};

export type AiCommandCenterScreenProps = UseAiCommandCenterDataParams & {
  onOpenSource?: (card: AiCommandCenterCardView) => void;
};

const HEADER_TITLE =
  "\u0427\u0442\u043e \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0440\u0435\u0448\u0435\u043d\u0438\u044f?";
const HEADER_SUBTITLE =
  "\u0418\u0418 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0438 \u043f\u043e \u0432\u0430\u0448\u0435\u0439 \u0440\u043e\u043b\u0438. \u041e\u043f\u0430\u0441\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0442\u0440\u0435\u0431\u0443\u044e\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.";

function readableRuntimeStatus(status: string): string {
  if (status === "loaded") return "\u0417\u0430\u0434\u0430\u0447\u0438 \u0433\u043e\u0442\u043e\u0432\u044b \u043a \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0443.";
  if (status === "blocked") return "\u041d\u0443\u0436\u043d\u043e \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u0435\u0440\u0435\u0434 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043c.";
  if (status === "denied") return "\u0414\u043b\u044f \u044d\u0442\u0438\u0445 \u0437\u0430\u0434\u0430\u0447 \u043d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430.";
  if (status === "empty") return "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0437\u0430\u0434\u0430\u0447 \u0434\u043b\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f.";
  return "\u0418\u0418 \u0433\u043e\u0442\u043e\u0432\u0438\u0442 \u0437\u0430\u0434\u0430\u0447\u0438.";
}

function readableRole(role: string): string {
  if (role === "director_control") return "\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f";
  if (role === "buyer") return "\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435";
  if (role === "warehouse") return "\u0441\u043a\u043b\u0430\u0434";
  if (role === "accountant") return "\u0444\u0438\u043d\u0430\u043d\u0441\u044b";
  if (role === "foreman") return "\u0440\u0430\u0431\u043e\u0442\u044b \u043d\u0430 \u043e\u0431\u044a\u0435\u043a\u0442\u0435";
  if (role === "contractor") return "\u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a";
  return "\u0442\u0435\u043a\u0443\u0449\u0430\u044f \u0440\u043e\u043b\u044c";
}

function readableConstructionDomain(domain: string): string {
  if (domain === "procurement") return "\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435";
  if (domain === "warehouse") return "\u0441\u043a\u043b\u0430\u0434";
  if (domain === "finance") return "\u0444\u0438\u043d\u0430\u043d\u0441\u044b";
  if (domain === "field_execution") return "\u0440\u0430\u0431\u043e\u0442\u044b";
  if (domain === "documents") return "\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b";
  if (domain === "contractor_management") return "\u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0438";
  if (domain === "real_estate_due_diligence") return "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043e\u0431\u044a\u0435\u043a\u0442\u0430";
  return "\u0440\u0430\u0437\u0434\u0435\u043b";
}

function readableRisk(risk: string, urgency: string): string {
  const riskLabel =
    risk === "high" ? "\u0432\u044b\u0441\u043e\u043a\u0438\u0439" : risk === "medium" ? "\u0441\u0440\u0435\u0434\u043d\u0438\u0439" : "\u043d\u0438\u0437\u043a\u0438\u0439";
  const urgencyLabel =
    urgency === "now" ? "\u0441\u0435\u0439\u0447\u0430\u0441" : urgency === "today" ? "\u0441\u0435\u0433\u043e\u0434\u043d\u044f" : urgency === "week" ? "\u043d\u0430 \u044d\u0442\u043e\u0439 \u043d\u0435\u0434\u0435\u043b\u0435" : "\u043f\u043e\u0434 \u043d\u0430\u0431\u043b\u044e\u0434\u0435\u043d\u0438\u0435\u043c";
  return `\u0420\u0438\u0441\u043a: ${riskLabel}. \u0421\u0440\u043e\u043a: ${urgencyLabel}.`;
}

function readableExternalStatus(status: string): string {
  if (status === "available_preview_only") {
    return "\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u0430\u043a \u043f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u043e\u0431\u0437\u043e\u0440.";
  }
  if (status === "blocked") return "\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0441\u0435\u0439\u0447\u0430\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b.";
  return "\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043d\u0435 \u043d\u0443\u0436\u043d\u044b \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u043e\u0442\u0432\u0435\u0442\u0430.";
}

function readableWorkdayStatus(status: string): string {
  if (status === "loaded") return "\u0417\u0430\u0434\u0430\u0447\u0438 \u043d\u0430 \u0434\u0435\u043d\u044c \u0433\u043e\u0442\u043e\u0432\u044b.";
  if (status === "blocked") return "\u0417\u0430\u0434\u0430\u0447\u0438 \u043d\u0430 \u0434\u0435\u043d\u044c \u043d\u0443\u0436\u0434\u0430\u044e\u0442\u0441\u044f \u0432 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0438.";
  return "\u0417\u0430\u0434\u0430\u0447\u0438 \u043d\u0430 \u0434\u0435\u043d\u044c: \u043f\u043e\u043a\u0430 \u043d\u0435\u0442.";
}

function buildPanel(
  card: AiCommandCenterCardView,
  action: AiCommandCenterActionView,
): ActionPanel {
  if (action.action === "ask_why") {
    return {
      title: card.title,
      body: `${card.summary}\n${card.evidenceRefs.join("\n") || card.evidenceLabel}`,
      mutationCount: 0,
      executed: false,
    };
  }

  if (action.action === "open_source") {
    return {
      title: "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
      body: "\u041e\u0442\u043a\u0440\u043e\u0435\u043c \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d \u0441 \u0438\u0441\u0445\u043e\u0434\u043d\u044b\u043c\u0438 \u0434\u0430\u043d\u043d\u044b\u043c\u0438. \u0411\u0435\u0437 \u0437\u0430\u043f\u0438\u0441\u0438 \u0438 \u0431\u0435\u0437 \u0441\u043a\u0440\u044b\u0442\u044b\u0445 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439.",
      mutationCount: 0,
      executed: false,
    };
  }

  if (action.action === "create_draft") {
    return {
      title: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      body: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d \u043a\u0430\u043a \u043f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442. \u042d\u0442\u043e \u043d\u0435 \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430.",
      mutationCount: 0,
      executed: false,
    };
  }

  if (action.action === "submit_for_approval") {
    return {
      title: "\u0421\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435",
      body: "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u0434\u043b\u044f \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u044f \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d. \u0418\u0418 \u043d\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0438 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441\u0430\u043c.",
      mutationCount: 0,
      executed: false,
    };
  }

  return {
    title: "\u041f\u0440\u0435\u0432\u044c\u044e",
    body: "\u041f\u043e\u043a\u0430\u0437\u0430\u043d \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u0439 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440. \u0417\u0430\u043f\u0438\u0441\u0435\u0439, \u043e\u043f\u043b\u0430\u0442 \u0438 \u0432\u043d\u0435\u0448\u043d\u0438\u0445 \u043e\u0442\u043f\u0440\u0430\u0432\u043e\u043a \u043d\u0435\u0442.",
    mutationCount: 0,
    executed: false,
  };
}

export default function AiCommandCenterScreen(props: AiCommandCenterScreenProps) {
  const { auth, sourceCards, onOpenSource } = props;
  const state = useAiCommandCenterData({
    auth,
    sourceCards,
  });
  const [panel, setPanel] = useState<ActionPanel | null>(null);
  const activeSections = useMemo(
    () => state.viewModel.sections.filter((section) => section.cards.length > 0),
    [state.viewModel.sections],
  );
  const screenActionSummary = buildAiScreenActionPreviewSummary({
    auth: state.auth,
    screenId: "ai.command_center",
  });
  const constructionKnowhowCard = useMemo(
    () => buildConstructionKnowhowPreviewCard(toConstructionKnowhowRoleId(state.auth?.role ?? "unknown")),
    [state.auth?.role],
  );

  const handleAction = useCallback(
    (card: AiCommandCenterCardView, action: AiCommandCenterActionView) => {
      if (!action.enabled) return;
      if (action.action === "open_source") {
        onOpenSource?.(card);
      }
      setPanel(buildPanel(card, action));
    },
    [onOpenSource],
  );

  return (
    <SafeAreaView
      testID="ai.command.center.screen"
      style={styles.safe}
      edges={["top", "bottom"]}
    >
      <View testID="ai.command_center.screen" style={styles.runtimeInlineMarker} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles-outline" size={22} color="#0F766E" />
          </View>
          <View style={styles.headerText}>
            <Text testID="ai.command.center.header" style={styles.title}>
              {HEADER_TITLE}
            </Text>
            <Text style={styles.subtitle}>{HEADER_SUBTITLE}</Text>
          </View>
        </View>

        <View testID="ai.screen.runtime.screen" style={styles.runtimeMatrixSurface}>
          <Text testID="ai.screen.runtime.status" style={styles.runtimeMatrixText}>
            {readableRuntimeStatus(state.viewModel.status)}{" "}
            \u0418\u0418 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u044f\u043b.
          </Text>
        </View>

        {state.loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.stateText}>
              \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0437\u0430\u0434\u0430\u0447\u0438...
            </Text>
          </View>
        ) : null}

        {!state.loading ? (
          <View testID="ai.command.center.runtime-status" style={styles.runtimeStatus}>
            <View testID="ai.command_center.task_stream" style={styles.runtimeInlineMarker} />
            <Text style={styles.runtimeStatusText}>
              {readableRuntimeStatus(state.viewModel.runtimeStatus)}{" "}
              \u0418\u0418 \u043d\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u044f\u043b \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f.
            </Text>
          </View>
        ) : null}

        {!state.loading && state.viewModel.taskStreamLoaded ? (
          <View testID="ai.command.center.task-stream-loaded" style={styles.loadedBadge}>
            <View testID="ai.screen.runtime.loaded" style={styles.runtimeInlineMarker} />
            <Text style={styles.loadedBadgeText}>
              \u0417\u0430\u0434\u0430\u0447\u0438 \u043f\u043e \u0432\u0430\u0448\u0435\u0439 \u0440\u043e\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u044b
            </Text>
          </View>
        ) : null}

        {!state.loading && state.viewModel.denied ? (
          <View testID="ai.command.center.denied-state" style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              \u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430
            </Text>
            <Text style={styles.stateText}>
              {state.viewModel.errorMessage}
            </Text>
          </View>
        ) : null}

        {!state.loading && !state.viewModel.denied && state.viewModel.status === "blocked" ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              \u041d\u0443\u0436\u043d\u043e \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435
            </Text>
            <Text style={styles.stateText}>
              {state.viewModel.blockedReason ?? state.viewModel.errorMessage}
            </Text>
          </View>
        ) : null}

        {!state.loading && !state.viewModel.denied && state.viewModel.empty && state.viewModel.status !== "blocked" ? (
          <View testID="ai.command.center.empty-state" style={styles.stateBox}>
            <View testID="ai.screen.runtime.empty" style={styles.runtimeInlineMarker} />
            <Text style={styles.stateTitle}>
              \u041d\u0435\u0442 \u0437\u0430\u0434\u0430\u0447
            </Text>
            <Text style={styles.stateText}>
              \u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0437\u0430\u0434\u0430\u0447 \u043f\u043e \u0432\u0430\u0448\u0435\u0439 \u0440\u043e\u043b\u0438
            </Text>
          </View>
        ) : null}

        {panel ? (
          <View testID="ai.command.center.action-preview" style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{panel.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="close"
                onPress={() => setPanel(null)}
                style={styles.panelClose}
              >
                <Ionicons name="close" size={16} color="#0F172A" />
              </Pressable>
            </View>
            <Text style={styles.panelBody}>{panel.body}</Text>
            <Text style={styles.panelMeta}>
              \u0418\u0418 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u0438\u043b \u0438 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u043b \u043d\u0430\u0440\u0443\u0436\u0443.
            </Text>
          </View>
        ) : null}

        <View testID="ai.workday.section" style={styles.workdaySurface}>
          <Text style={styles.workdayTitle}>{readableWorkdayStatus(state.viewModel.workday.status)}</Text>
          <Text style={styles.workdayMeta}>
            \u0418\u0418 \u043d\u0435 \u0432\u043d\u043e\u0441\u0438\u043b \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u0438 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u043b \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0430\u0440\u0443\u0436\u0443.
          </Text>
          {state.viewModel.workday.cards.length > 0 ? (
            state.viewModel.workday.cards.map((card) => (
              <View key={card.taskId} testID="ai.workday.card" style={styles.workdayCard}>
                <Text style={styles.workdayCardTitle}>{card.title}</Text>
                <Text style={styles.workdayCardSummary}>{card.summary}</Text>
                <Text testID="ai.workday.card.evidence" style={styles.workdayChip}>
                  \u041e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435: {card.evidenceLabel}
                </Text>
                <Text testID="ai.workday.card.risk" style={styles.workdayChip}>
                  \u0420\u0438\u0441\u043a: {card.riskLabel}. \u0420\u0435\u0436\u0438\u043c: {card.suggestedMode}
                </Text>
                <Text testID="ai.workday.card.next_action" style={styles.workdayChip}>
                  \u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433: {card.nextActionLabel}
                </Text>
              </View>
            ))
          ) : (
            <View testID="ai.workday.empty_state" style={styles.workdayEmpty}>
              <Text style={styles.workdayEmptyText}>
                {state.viewModel.workday.emptyReason ??
                  "No eligible evidence-backed workday tasks were available."}
              </Text>
            </View>
          )}
        </View>

        {activeSections.map((section) => (
          <AiCommandCenterSection
            key={section.id}
            section={section}
            onAction={handleAction}
          />
        ))}

        <View testID="ai.screen.actions.preview" style={styles.screenActionSurface}>
          <Text testID="ai.screen.actions.role" style={styles.screenActionText}>
            \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u043d\u044b \u043f\u043e\u0434 \u0432\u0430\u0448\u0443 \u0440\u043e\u043b\u044c. \u0418\u0418 \u043d\u0435 \u043c\u0435\u043d\u044f\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0435.
          </Text>
          <Text testID="ai.screen.actions.safe_read" style={styles.screenActionText}>
            \u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u0439 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440: {screenActionSummary.safeReadCount}
          </Text>
          <Text testID="ai.screen.actions.draft" style={styles.screenActionText}>
            \u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a\u0438: {screenActionSummary.draftCount}
          </Text>
          <Text testID="ai.screen.actions.approval_required" style={styles.screenActionText}>
            \u0427\u0435\u0440\u0435\u0437 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435: {screenActionSummary.approvalRequiredCount}
          </Text>
        </View>

        <View testID="ai.construction.knowhow.preview" style={styles.constructionSurface}>
          <Text testID="ai.construction.knowhow.role" style={styles.constructionMeta}>
            \u0420\u043e\u043b\u044c: {readableRole(constructionKnowhowCard.rolePerspective)}
          </Text>
          <Text testID="ai.construction.knowhow.domain" style={styles.constructionTitle}>
            \u0420\u0430\u0437\u0434\u0435\u043b: {readableConstructionDomain(constructionKnowhowCard.domain)}
          </Text>
          <Text testID="ai.construction.knowhow.evidence" style={styles.constructionMeta}>
            \u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430: {constructionKnowhowCard.evidenceRefs.length} \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430
          </Text>
          <Text testID="ai.construction.knowhow.risk" style={styles.constructionMeta}>
            {readableRisk(constructionKnowhowCard.riskLevel, constructionKnowhowCard.urgency)}
          </Text>
          <Text testID="ai.construction.knowhow.safe_actions" style={styles.constructionMeta}>
            \u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u0439 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440: {constructionKnowhowCard.recommendedActions.safeRead.length}
          </Text>
          <Text testID="ai.construction.knowhow.draft_actions" style={styles.constructionMeta}>
            \u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a\u0438: {constructionKnowhowCard.recommendedActions.draftOnly.length}
          </Text>
          <Text testID="ai.construction.knowhow.approval_required" style={styles.constructionMeta}>
            \u0427\u0435\u0440\u0435\u0437 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435: {constructionKnowhowCard.recommendedActions.approvalRequired.length}
          </Text>
          <Text testID="ai.construction.knowhow.external_status" style={styles.constructionMeta}>
            {readableExternalStatus(constructionKnowhowCard.externalIntelStatus)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
