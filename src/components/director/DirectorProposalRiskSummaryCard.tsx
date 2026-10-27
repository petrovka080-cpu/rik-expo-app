import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  generateDirectorProposalRiskSummary,
  type DirectorProposalRiskSummaryContext,
  type DirectorProposalRiskSummaryOutput,
  type DirectorProposalRiskSummaryProvider,
} from "../../shared/ai/directorProposalRiskSummary";
import {
  isDirectorProposalRiskSummaryUiEnabled,
  readAiWorkflowFlags,
} from "../../shared/ai/aiWorkflowFlags";

type Props = {
  context: DirectorProposalRiskSummaryContext;
  enabled?: boolean;
  provider?: DirectorProposalRiskSummaryProvider | null;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; summary: DirectorProposalRiskSummaryOutput }
  | { kind: "error"; message: string };

export default function DirectorProposalRiskSummaryCard({
  context,
  enabled,
  provider = null,
}: Props) {
  const flags = readAiWorkflowFlags();
  const visible = enabled ?? isDirectorProposalRiskSummaryUiEnabled(flags);
  const [state, setState] = React.useState<State>({ kind: "idle" });

  if (!visible) return null;

  const runSummary = async () => {
    setState({ kind: "loading" });
    const result = await generateDirectorProposalRiskSummary({
      context,
      provider,
      flags: {
        ...flags,
        directorProposalRiskSummaryEnabled: true,
      },
      allowMockProvider: Boolean(provider),
    });

    if (result.ok) {
      setState({ kind: "ready", summary: result.value });
      return;
    }

    setState({ kind: "error", message: result.error.message });
  };

  return (
    <View style={styles.card} testID="director-proposal-risk-summary-card">
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI risk summary</Text>
        <Text style={styles.badge}>Advisory</Text>
      </View>
      <Text style={styles.body}>
        AI summary is advisory. Review proposal details before decisions.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={state.kind === "loading"}
        onPress={() => void runSummary()}
        style={({ pressed }) => [
          styles.button,
          state.kind === "loading" ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
        testID="director-proposal-risk-summary-run"
      >
        <Text style={styles.buttonText}>
          {state.kind === "loading" ? "Preparing..." : "Summarize risks"}
        </Text>
      </Pressable>

      {state.kind === "error" ? (
        <Text style={styles.error} testID="director-proposal-risk-summary-error">
          {state.message}
        </Text>
      ) : null}

      {state.kind === "ready" ? (
        <View style={styles.result} testID="director-proposal-risk-summary-result">
          <Text style={styles.resultTitle}>{state.summary.summary}</Text>
          <Text style={styles.meta}>Confidence: {state.summary.confidenceLabel}</Text>
          {state.summary.riskFlags.map((flag, index) => (
            <Text key={`risk-${index}`} style={styles.listText}>
              Risk: {flag}
            </Text>
          ))}
          {state.summary.suggestedChecks.map((check, index) => (
            <Text key={`check-${index}`} style={styles.listText}>
              Check: {check}
            </Text>
          ))}
          {state.summary.limitations.map((limitation, index) => (
            <Text key={`limitation-${index}`} style={styles.meta}>
              Limitation: {limitation}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.28)",
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  badge: {
    color: "#BAE6FD",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  body: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0EA5E9",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  error: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 17,
  },
  result: {
    gap: 6,
  },
  resultTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  listText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
  },
});
