import type { SupabaseClient } from "@supabase/supabase-js";

import { publishRfq } from "./buyer.actions.repo";
import type { AlertFn, BuyerMutationResult } from "./buyer.mutation.shared";
import {
  createBuyerMutationTracker,
  formatBuyerMutationFailure,
} from "./buyer.mutation.shared";

type PublishRfqStage =
  | "validate_selection"
  | "validate_deadline"
  | "validate_delivery_days"
  | "validate_delivery_location"
  | "validate_contacts"
  | "publish_rfq";

const RFQ_STAGE_LABELS: Record<PublishRfqStage, string> = {
  validate_selection: "Проверка выбранных позиций",
  validate_deadline: "Проверка дедлайна",
  validate_delivery_days: "Проверка срока поставки",
  validate_delivery_location: "Проверка места поставки",
  validate_contacts: "Проверка контактов",
  publish_rfq: "Публикация торгов",
};

export async function publishRfqAction(p: {
  pickedIds: string[];
  rfqDeadlineIso: string;
  rfqDeliveryDays: string;
  rfqCity: string;
  rfqAddressText: string;
  rfqPhone: string;
  rfqCountryCode: string;
  rfqEmail: string;
  rfqVisibility: "open" | "company_only";
  rfqNote: string;
  supabase: SupabaseClient;
  setBusy: (v: boolean) => void;
  closeSheet: () => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<PublishRfqStage, { tenderId: string | null }>> {
  const tracker = createBuyerMutationTracker<PublishRfqStage>({
    family: "rfq",
    operation: "publish_rfq",
  });

  tracker.markStarted("validate_selection", { pickedCount: p.pickedIds.length });
  if (p.pickedIds.length === 0) {
    const failure = tracker.asFailure(
      "validate_selection",
      new Error("Выбери позиции для торгов"),
      "Выбери позиции для торгов",
    );
    p.alert("Пусто", "Выбери позиции для торгов");
    return failure;
  }
  tracker.markCompleted("validate_selection", { pickedCount: p.pickedIds.length });

  tracker.markStarted("validate_deadline");
  const deadline = new Date(p.rfqDeadlineIso);
  if (Number.isNaN(deadline.getTime())) {
    const failure = tracker.asFailure(
      "validate_deadline",
      new Error("Неверная дата"),
      "Неверная дата",
    );
    p.alert("Дедлайн", "Неверная дата");
    return failure;
  }
  if (deadline.getTime() < Date.now() + 5 * 60 * 1000) {
    const failure = tracker.asFailure(
      "validate_deadline",
      new Error("Поставь минимум +5 минут от текущего времени"),
      "Поставь минимум +5 минут от текущего времени",
    );
    p.alert("Дедлайн", "Поставь минимум +5 минут от текущего времени");
    return failure;
  }
  tracker.markCompleted("validate_deadline");

  tracker.markStarted("validate_delivery_days");
  const deliveryDays = Number(String(p.rfqDeliveryDays).trim());
  if (!Number.isFinite(deliveryDays) || deliveryDays < 0) {
    const failure = tracker.asFailure(
      "validate_delivery_days",
      new Error("Укажи число дней (0 или больше)"),
      "Укажи число дней (0 или больше)",
    );
    p.alert("Срок поставки", "Укажи число дней (0 или больше)");
    return failure;
  }
  tracker.markCompleted("validate_delivery_days");

  tracker.markStarted("validate_delivery_location");
  const city = p.rfqCity.trim();
  const address = p.rfqAddressText.trim();
  if (!city && !address) {
    const failure = tracker.asFailure(
      "validate_delivery_location",
      new Error("Укажи город или адрес"),
      "Укажи город или адрес",
    );
    p.alert("Место поставки", "Укажи город или адрес");
    return failure;
  }
  tracker.markCompleted("validate_delivery_location");

  tracker.markStarted("validate_contacts");
  const phoneLocal = String(p.rfqPhone ?? "").replace(/[^\d]/g, "").trim();
  const countryCode = String(p.rfqCountryCode ?? "+996").replace(/[^\d]/g, "");
  const phoneFull = phoneLocal ? `+${countryCode}${phoneLocal}` : null;
  const email = String(p.rfqEmail ?? "").trim() || null;
  if (!(phoneFull || email)) {
    const failure = tracker.asFailure(
      "validate_contacts",
      new Error("Укажи телефон или email"),
      "Укажи телефон или email",
    );
    p.alert("Контакты", "Укажи телефон или email");
    return failure;
  }
  tracker.markCompleted("validate_contacts");

  const visibility = p.rfqVisibility === "company_only" ? "invited" : "open";

  p.setBusy(true);
  try {
    tracker.markStarted("publish_rfq");
    const res = await publishRfq(p.supabase, {
      p_request_item_ids: p.pickedIds,
      p_deadline_at: deadline.toISOString(),
      p_contact_phone: phoneFull,
      p_contact_email: email,
      p_contact_whatsapp: null,
      p_delivery_days: deliveryDays,
      p_radius_km: null,
      p_visibility: visibility,
      p_city: city || null,
      p_lat: null,
      p_lng: null,
      p_address_text: address || null,
      p_address_place_id: null,
      p_note: p.rfqNote.trim() || null,
    });
    if (res.error) {
      const failure = tracker.asFailure(
        "publish_rfq",
        res.error,
        "Не удалось опубликовать торги",
      );
      p.alert(
        "Ошибка",
        formatBuyerMutationFailure(failure, RFQ_STAGE_LABELS, "Не удалось опубликовать торги"),
      );
      return failure;
    }
    const tenderId = res.data == null ? null : String(res.data);
    tracker.markCompleted("publish_rfq", { tenderId });
    p.alert("Готово", `Торги опубликованы (${String(tenderId || "").slice(0, 8)})`);
    p.closeSheet();
    return tracker.success({ tenderId });
  } finally {
    p.setBusy(false);
  }
}

export const RFQ_MUTATION_STAGE_LABELS = RFQ_STAGE_LABELS;
