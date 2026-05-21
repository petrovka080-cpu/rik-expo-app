import {
  includesAnyNormalized,
  normalizeUniversalRoleQaQuestion,
} from "./universalQuestionNormalizer";

export type UniversalRoleQaEntity =
  | "procurement_request"
  | "procurement_request_line"
  | "purchase_order"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "warehouse_reservation"
  | "payment"
  | "invoice"
  | "act"
  | "contract"
  | "debt"
  | "partial_payment"
  | "accounting_entry"
  | "document"
  | "pdf_document"
  | "report"
  | "work"
  | "task"
  | "object"
  | "building"
  | "floor"
  | "zone"
  | "construction_work_type"
  | "material"
  | "marketplace_product"
  | "marketplace_offer"
  | "supplier"
  | "contractor"
  | "photo"
  | "video"
  | "approval"
  | "company"
  | "user"
  | "client_project"
  | "unknown";

export type ConstructionWorkType =
  | "asphalt_paving"
  | "paving_blocks"
  | "concrete_screed"
  | "concrete_foundation"
  | "masonry"
  | "drywall_partitions"
  | "plastering"
  | "painting"
  | "flooring"
  | "roofing"
  | "facade"
  | "windows_installation"
  | "doors_installation"
  | "electrical"
  | "plumbing"
  | "heating"
  | "ventilation"
  | "fire_safety"
  | "low_voltage"
  | "earthworks"
  | "roadworks"
  | "landscaping"
  | "metal_structures"
  | "waterproofing"
  | "insulation"
  | "tiles"
  | "ceiling"
  | "demolition"
  | "unknown";

export function classifyConstructionWorkType(questionRu: string): ConstructionWorkType {
  const text = normalizeUniversalRoleQaQuestion(questionRu);
  if (includesAnyNormalized(text, ["гидроизоляц"])) return "waterproofing";
  if (includesAnyNormalized(text, ["металлоконструкц", "металл конструкц"])) return "metal_structures";
  if (includesAnyNormalized(text, ["асфальт", "дорожное покрытие"])) return "asphalt_paving";
  if (includesAnyNormalized(text, ["брусчат", "тротуарн"])) return "paving_blocks";
  if (includesAnyNormalized(text, ["стяжк"])) return "concrete_screed";
  if (includesAnyNormalized(text, ["фундамент", "монолит", "бетон"])) return "concrete_foundation";
  if (includesAnyNormalized(text, ["кладк", "кирпич", "газоблок"])) return "masonry";
  if (includesAnyNormalized(text, ["гкл", "гипсокартон", "перегород"])) return "drywall_partitions";
  if (includesAnyNormalized(text, ["штукатур"])) return "plastering";
  if (includesAnyNormalized(text, ["покраск", "малярн"])) return "painting";
  if (includesAnyNormalized(text, ["ламинат", "полы", "flooring"])) return "flooring";
  if (includesAnyNormalized(text, ["кровл", "крыша"])) return "roofing";
  if (includesAnyNormalized(text, ["фасад"])) return "facade";
  if (includesAnyNormalized(text, ["окна", "окон"])) return "windows_installation";
  if (includesAnyNormalized(text, ["двер", "дверей"])) return "doors_installation";
  if (includesAnyNormalized(text, ["электр", "проводк", "кабель"])) return "electrical";
  if (includesAnyNormalized(text, ["сантех", "водопровод", "канализац"])) return "plumbing";
  if (includesAnyNormalized(text, ["отоплен"])) return "heating";
  if (includesAnyNormalized(text, ["вентиляц"])) return "ventilation";
  if (includesAnyNormalized(text, ["пожар", "спринклер"])) return "fire_safety";
  if (includesAnyNormalized(text, ["слаботоч", "скс", "видеонаблюд"])) return "low_voltage";
  if (includesAnyNormalized(text, ["землян", "котлован", "грунт"])) return "earthworks";
  if (includesAnyNormalized(text, ["дорог", "road"])) return "roadworks";
  if (includesAnyNormalized(text, ["благоустрой", "газон", "озелен"])) return "landscaping";
  if (includesAnyNormalized(text, ["утепл", "изоляц"])) return "insulation";
  if (includesAnyNormalized(text, ["плитк", "кафель"])) return "tiles";
  if (includesAnyNormalized(text, ["потолок", "ceiling"])) return "ceiling";
  if (includesAnyNormalized(text, ["демонтаж", "снос"])) return "demolition";
  return "unknown";
}

export function extractUniversalRoleQaEntity(questionRu: string): UniversalRoleQaEntity {
  const text = normalizeUniversalRoleQaQuestion(questionRu);
  if (includesAnyNormalized(text, ["проводк", "учитывать аванс", "бухгалтерск"])) return "accounting_entry";
  if (includesAnyNormalized(text, ["частичн"])) return "partial_payment";
  if (includesAnyNormalized(text, ["долг", "задолжен"])) return "debt";
  if (includesAnyNormalized(text, ["платеж", "оплат"])) return "payment";
  if (includesAnyNormalized(text, ["счет"])) return "invoice";
  if (includesAnyNormalized(text, ["акт"])) return "act";
  if (includesAnyNormalized(text, ["договор", "контракт"])) return "contract";
  if (includesAnyNormalized(text, ["pdf", "пдф"])) return "pdf_document";
  if (includesAnyNormalized(text, ["документ", "доки"])) return "document";
  if (includesAnyNormalized(text, ["заяв"])) return "procurement_request";
  if (includesAnyNormalized(text, ["строк"])) return "procurement_request_line";
  if (includesAnyNormalized(text, ["закупк", "purchase order"])) return "purchase_order";
  if (includesAnyNormalized(text, ["выдач", "выдали", "куда ушел", "куда ушла"])) return "warehouse_issue";
  if (includesAnyNormalized(text, ["приход"])) return "warehouse_incoming";
  if (includesAnyNormalized(text, ["резерв"])) return "warehouse_reservation";
  if (includesAnyNormalized(text, ["склад", "остаток"])) return "warehouse_stock";
  if (includesAnyNormalized(text, ["поставщик"])) return "supplier";
  if (includesAnyNormalized(text, ["товар", "marketplace", "карточк"])) return "marketplace_product";
  if (includesAnyNormalized(text, ["предложен", "вариант"])) return "marketplace_offer";
  if (includesAnyNormalized(text, ["подрядчик"])) return "contractor";
  if (includesAnyNormalized(text, ["работ", "закрыть"])) return "work";
  if (includesAnyNormalized(text, ["задач"])) return "task";
  if (includesAnyNormalized(text, ["объект"])) return "object";
  if (includesAnyNormalized(text, ["здание"])) return "building";
  if (includesAnyNormalized(text, ["этаж", "первому", "первый"])) return "floor";
  if (includesAnyNormalized(text, ["зона"])) return "zone";
  if (classifyConstructionWorkType(text) !== "unknown" && includesAnyNormalized(text, ["смет", "расход", "посчитай", "как ", "этап"])) {
    return "construction_work_type";
  }
  if (includesAnyNormalized(text, ["материал", "гкл", "профиль", "цемент", "кабель"])) return "material";
  if (includesAnyNormalized(text, ["фото"])) return "photo";
  if (includesAnyNormalized(text, ["видео"])) return "video";
  if (includesAnyNormalized(text, ["approval", "согласован", "утвержд"])) return "approval";
  if (includesAnyNormalized(text, ["компания", "осоо"])) return "company";
  if (includesAnyNormalized(text, ["пользователь", "прораб", "директор"])) return "user";
  if (includesAnyNormalized(text, ["клиент", "проект клиента"])) return "client_project";
  if (classifyConstructionWorkType(text) !== "unknown") return "construction_work_type";
  return "unknown";
}
