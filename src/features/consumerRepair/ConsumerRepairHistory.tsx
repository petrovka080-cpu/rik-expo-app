import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { ConsumerRepairPdfRow } from "./ConsumerRepairPdfRow";

type Props = {
  history: ConsumerRepairDraftBundle[];
  onOpenPdf: (requestDraftId: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
};

export function ConsumerRepairHistory({ history, onOpenPdf, onOpenDraft }: Props): React.ReactElement {
  return (
    <View style={styles.card} testID="consumer-repair-history">
      <Text style={styles.title}>История заявок</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>PDF-заявки появятся здесь после утверждения.</Text>
      ) : (
        history.map((bundle) => (
          <ConsumerRepairPdfRow
            key={bundle.draft.id}
            bundle={bundle}
            onOpenPdf={onOpenPdf}
            onOpenDraft={onOpenDraft}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  empty: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
});
