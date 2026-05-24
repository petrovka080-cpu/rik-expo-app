import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle, ConsumerRequestValidationErrorItem } from "../../lib/consumerRequests";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  errors?: ConsumerRequestValidationErrorItem[];
};

export function buildConsumerRepairMarketplaceSendErrors(params: {
  bundle: ConsumerRepairDraftBundle | null;
  contactPhone: string;
  problemText: string;
}): ConsumerRequestValidationErrorItem[] {
  const { bundle, contactPhone, problemText } = params;
  if (!bundle || bundle.draft.status !== "consumer_approved") return [];
  const errors: ConsumerRequestValidationErrorItem[] = [];
  if (contactPhone.trim().replace(/\D/g, "").length < 7) {
    errors.push({ code: "CONTACT_REQUIRED", messageRu: "Укажите телефон, чтобы мастера могли связаться с вами.", field: "contactPhone" });
  }
  if (problemText.trim().length < 20) {
    errors.push({ code: "DESCRIPTION_REQUIRED", messageRu: "Добавьте описание проблемы.", field: "problemText" });
  }
  if (bundle.media.length < 1) {
    errors.push({ code: "MEDIA_REQUIRED", messageRu: "Добавьте хотя бы одно фото, видео или документ.", field: "media" });
  }
  if (bundle.items.length < 1) {
    errors.push({ code: "ITEMS_REQUIRED", messageRu: "Добавьте хотя бы одну позицию заявки.", field: "items" });
  }
  if (!bundle.pdfs.some((pdf) => pdf.pdfStatus === "generated")) {
    errors.push({ code: "PDF_REQUIRED", messageRu: "Сначала создайте PDF заявки.", field: "pdf" });
  }
  return errors;
}

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
