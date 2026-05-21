import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle, ConsumerRequestValidationErrorItem } from "../../lib/consumerRequests";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  errors?: ConsumerRequestValidationErrorItem[];
};

export function ConsumerRepairMarketplaceSend({ bundle, errors = [] }: Props): React.ReactElement | null {
  if (!bundle || bundle.draft.status === "draft") return null;

  const sent = bundle.marketplaceLink.status === "sent" || bundle.draft.status === "sent_to_marketplace";
  const blocked = !sent && errors.length > 0;
  return (
    <View style={styles.panel} testID="consumer-repair-marketplace-link">
      <Text style={styles.title}>
        {sent ? "Отправлено в маркет" : blocked ? "Чтобы отправить в маркет, добавьте:" : "Можно отправить в маркет"}
      </Text>
      <Text style={styles.text}>
        {sent
          ? "Заявка доступна как потребность marketplace. Офисные процессы не затронуты."
          : blocked
            ? errors.map((error) => `• ${error.messageRu}`).join("\n")
            : "После утверждения вы можете явно отправить заявку в маркет, чтобы получить предложения."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 14,
    gap: 4,
  },
  title: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: "900",
  },
  text: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
