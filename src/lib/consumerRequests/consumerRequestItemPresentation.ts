import {
  asphaltProfessionalCategoryFromSourceParametersV4,
  asphaltProfessionalCategoryPresentationV4,
} from "../estimate/v4/asphalt/asphaltProfessionalPresentationV4";
import type { ConsumerRepairRequestItem } from "./consumerRequestTypes";

export function consumerRepairRequestItemTypeLabel(item: ConsumerRepairRequestItem): string {
  const asphaltCategory = asphaltProfessionalCategoryFromSourceParametersV4(item.sourceParameters);
  if (asphaltCategory) return asphaltProfessionalCategoryPresentationV4(asphaltCategory).itemLabelRu;
  if (item.itemType === "work") return "Работа";
  if (item.itemType === "material") return "Материал";
  if (item.itemType === "service") return "Оборудование / доставка";
  return "Позиция";
}
