import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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
      body: `${card.sourceScreenId ?? "unknown"} / ${card.sourceEntityType ?? "entity"} / ${
        card.sourceEntityIdHash ?? "hash"
      }`,
      mutationCount: 0,
      executed: false,
    };
  }

  if (action.action === "create_draft") {
    return {
      title: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      body: `${action.toolName ?? "draft_tool"}: draft-only preview. submit_for_approval is the next boundary.`,
      mutationCount: 0,
      executed: false,
    };
  }

  if (action.action === "submit_for_approval") {
    return {
      title: "approval",
      body: "submit_for_approval route selected. Final mutation was not executed.",
      mutationCount: 0,
      executed: false,
    };
  }

  return {
    title: "\u041f\u0440\u0435\u0432\u044c\u044e",
    body: `${action.toolName ?? "safe_read"}: safe-read preview boundary.`,
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

        {state.loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.stateText}>
              \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c task stream...
            </Text>
          </View>
        ) : null}

        {!state.loading && state.viewModel.denied ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              \u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430
            </Text>
            <Text style={styles.stateText}>
              {state.viewModel.errorMessage}
            </Text>
          </View>
        ) : null}

        {!state.loading && !state.viewModel.denied && state.viewModel.empty ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              \u041d\u0435\u0442 \u0437\u0430\u0434\u0430\u0447
            </Text>
            <Text style={styles.stateText}>
              GET /agent/task-stream \u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b role-scoped cards.
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
              mutation_count={panel.mutationCount}; executed={String(panel.executed)}
            </Text>
          </View>
        ) : null}

        {activeSections.map((section) => (
          <AiCommandCenterSection
            key={section.id}
            section={section}
            onAction={handleAction}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  subtitle: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  stateBox: {
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 6,
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  stateText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  panel: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    padding: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  panelTitle: {
    color: "#134E4A",
    fontSize: 14,
    fontWeight: "900",
    flex: 1,
  },
  panelClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  panelBody: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  panelMeta: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
});
