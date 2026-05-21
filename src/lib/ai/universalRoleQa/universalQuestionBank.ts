import type { UniversalRoleQaEntity } from "./universalEntityExtractor";
import type { UniversalRoleQaIntent } from "./universalIntentClassifier";

export type UniversalRoleQaQuestionBankCategory =
  | "app_data"
  | "construction"
  | "marketplace"
  | "documents"
  | "role"
  | "typo"
  | "security_admin_client";

export type UniversalRoleQaQuestionBankEntry = {
  id: string;
  category: UniversalRoleQaQuestionBankCategory;
  questionRu: string;
  expectedIntent: UniversalRoleQaIntent;
  expectedEntity: UniversalRoleQaEntity;
};

const seeds: Record<UniversalRoleQaQuestionBankCategory, Omit<UniversalRoleQaQuestionBankEntry, "id" | "category">[]> = {
  app_data: [
    { questionRu: "сколько заявок за май", expectedIntent: "app_data_count", expectedEntity: "procurement_request" },
    { questionRu: "покажи заявки по первому этажу", expectedIntent: "app_data_list", expectedEntity: "procurement_request" },
    { questionRu: "какие платежи без документов", expectedIntent: "finance_payment_review", expectedEntity: "payment" },
    { questionRu: "какие работы не закрыты", expectedIntent: "app_data_list", expectedEntity: "work" },
    { questionRu: "что выдали на первый этаж", expectedIntent: "warehouse_issue_trace", expectedEntity: "warehouse_issue" },
  ],
  construction: [
    { questionRu: "дай смету на асфальт 100 м2", expectedIntent: "construction_estimate", expectedEntity: "construction_work_type" },
    { questionRu: "расход штукатурки на 200 м2", expectedIntent: "construction_material_calculation", expectedEntity: "construction_work_type" },
    { questionRu: "посчитай бетон на фундамент", expectedIntent: "construction_material_calculation", expectedEntity: "construction_work_type" },
    { questionRu: "как проверить гидроизоляцию", expectedIntent: "construction_technology", expectedEntity: "construction_work_type" },
    { questionRu: "какие этапы монтажа окон", expectedIntent: "construction_technology", expectedEntity: "construction_work_type" },
  ],
  marketplace: [
    { questionRu: "найди поставщиков ГКЛ", expectedIntent: "marketplace_supplier_search", expectedEntity: "supplier" },
    { questionRu: "подбери варианты двери", expectedIntent: "marketplace_supplier_search", expectedEntity: "marketplace_offer" },
    { questionRu: "сравни поставщиков цемента", expectedIntent: "marketplace_supplier_search", expectedEntity: "supplier" },
    { questionRu: "найди аналоги профиля", expectedIntent: "marketplace_supplier_search", expectedEntity: "marketplace_offer" },
    { questionRu: "что купить по заявке номер 124", expectedIntent: "procurement_offer_selection", expectedEntity: "procurement_request" },
  ],
  documents: [
    { questionRu: "что в этом PDF", expectedIntent: "document_pdf_explanation", expectedEntity: "pdf_document" },
    { questionRu: "с чем связан счет", expectedIntent: "document_pdf_explanation", expectedEntity: "invoice" },
    { questionRu: "какой документ блокирует оплату", expectedIntent: "document_payment_blocker_review", expectedEntity: "payment" },
    { questionRu: "каких документов не хватает", expectedIntent: "document_missing_links_review", expectedEntity: "document" },
    { questionRu: "покажи PDF по заявке", expectedIntent: "document_pdf_explanation", expectedEntity: "pdf_document" },
  ],
  role: [
    { questionRu: "что мне решить сегодня", expectedIntent: "director_decision_summary", expectedEntity: "unknown" },
    { questionRu: "что мне закрыть как прорабу", expectedIntent: "field_work_review", expectedEntity: "work" },
    { questionRu: "что купить снабженцу", expectedIntent: "procurement_request_review", expectedEntity: "purchase_order" },
    { questionRu: "что проверить бухгалтеру", expectedIntent: "finance_payment_review", expectedEntity: "payment" },
    { questionRu: "что выдать складу", expectedIntent: "warehouse_issue_trace", expectedEntity: "warehouse_issue" },
  ],
  typo: [
    { questionRu: "сколко заявк было за май", expectedIntent: "app_data_count", expectedEntity: "procurement_request" },
    { questionRu: "дай смтеу на асфалт 100 кв", expectedIntent: "construction_estimate", expectedEntity: "construction_work_type" },
    { questionRu: "выдай зачвки по перваму этажу", expectedIntent: "app_data_list", expectedEntity: "procurement_request" },
    { questionRu: "покжи платжи без докумнтов", expectedIntent: "finance_payment_review", expectedEntity: "payment" },
    { questionRu: "найди паставшиков гкл", expectedIntent: "marketplace_supplier_search", expectedEntity: "supplier" },
  ],
  security_admin_client: [
    { questionRu: "какие роли проверить администратору", expectedIntent: "app_data_list", expectedEntity: "user" },
    { questionRu: "что видит клиент по проекту", expectedIntent: "client_progress_review", expectedEntity: "client_project" },
    { questionRu: "покажи отчет без runtime debug", expectedIntent: "app_data_list", expectedEntity: "report" },
    { questionRu: "какие approvals ждут", expectedIntent: "app_data_list", expectedEntity: "approval" },
    { questionRu: "какие пользователи требуют проверки", expectedIntent: "app_data_list", expectedEntity: "user" },
  ],
};

const targets: Record<UniversalRoleQaQuestionBankCategory, number> = {
  app_data: 100,
  construction: 100,
  marketplace: 75,
  documents: 75,
  role: 75,
  typo: 50,
  security_admin_client: 25,
};

export function getUniversalRoleQaQuestionBank(): UniversalRoleQaQuestionBankEntry[] {
  return Object.entries(targets).flatMap(([category, target]) => {
    const typedCategory = category as UniversalRoleQaQuestionBankCategory;
    const categorySeeds = seeds[typedCategory];
    return Array.from({ length: target }, (_, index) => {
      const seed = categorySeeds[index % categorySeeds.length];
      return {
        id: `${typedCategory}-${index + 1}`,
        category: typedCategory,
        questionRu: index < categorySeeds.length ? seed.questionRu : `${seed.questionRu} вариант ${Math.floor(index / categorySeeds.length) + 1}`,
        expectedIntent: seed.expectedIntent,
        expectedEntity: seed.expectedEntity,
      };
    });
  });
}

export function getUniversalRoleQaQuestionBankCoverage(): Record<UniversalRoleQaQuestionBankCategory | "total", number> {
  const entries = getUniversalRoleQaQuestionBank();
  return {
    total: entries.length,
    app_data: entries.filter((entry) => entry.category === "app_data").length,
    construction: entries.filter((entry) => entry.category === "construction").length,
    marketplace: entries.filter((entry) => entry.category === "marketplace").length,
    documents: entries.filter((entry) => entry.category === "documents").length,
    role: entries.filter((entry) => entry.category === "role").length,
    typo: entries.filter((entry) => entry.category === "typo").length,
    security_admin_client: entries.filter((entry) => entry.category === "security_admin_client").length,
  };
}
