import { buildAccountantPaymentWorkflowAnswer } from "./accountant/accountantPaymentWorkflow";
import { buildBuyerProcurementWorkflowAnswer } from "./buyer/buyerProcurementWorkflow";
import { buildClientProgressWorkflowAnswer } from "./client/clientProgressWorkflow";
import { buildContractorAcceptanceWorkflowAnswer } from "./contractor/contractorAcceptanceWorkflow";
import { buildDirectorDecisionWorkflowAnswer } from "./director/directorDecisionWorkflow";
import { buildDocumentEvidenceWorkflowAnswer } from "./documents/documentEvidenceWorkflow";
import { buildForemanCloseoutWorkflowAnswer } from "./foreman/foremanCloseoutWorkflow";
import { buildMarketplaceProductDraftWorkflowAnswer } from "./marketplace/marketplaceProductDraftWorkflow";
import { buildOfficeStuckWorkWorkflowAnswer } from "./office/officeStuckWorkWorkflow";
import { buildWarehouseMovementWorkflowAnswer } from "./warehouse/warehouseMovementWorkflow";
import { buildAiRoleWorkflowContext } from "./aiRoleWorkflowContextBuilder";
import { guardAiRoleWorkflowAnswer } from "./aiRoleWorkflowSafetyGuard";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowId,
  AiRoleWorkflowRequest,
  AiRoleWorkflowTrace,
} from "./aiRoleWorkflowTypes";

type AiRoleWorkflowBuilder = (
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
) => AiRoleWorkflowAnswer;

export const AI_ROLE_WORKFLOW_ROUTER: Record<AiRoleWorkflowId, AiRoleWorkflowBuilder> = {
  director_daily_decision_queue: buildDirectorDecisionWorkflowAnswer,
  director_object_blocker_review: buildDirectorDecisionWorkflowAnswer,
  foreman_today_closeout: buildForemanCloseoutWorkflowAnswer,
  foreman_material_evidence_check: buildForemanCloseoutWorkflowAnswer,
  buyer_approved_request_to_purchase_draft: buildBuyerProcurementWorkflowAnswer,
  buyer_supplier_comparison: buildBuyerProcurementWorkflowAnswer,
  accountant_payment_readiness: buildAccountantPaymentWorkflowAnswer,
  accountant_accounting_entry_reference: buildAccountantPaymentWorkflowAnswer,
  warehouse_item_trace: buildWarehouseMovementWorkflowAnswer,
  warehouse_deficit_to_request_draft: buildWarehouseMovementWorkflowAnswer,
  contractor_acceptance_closeout: buildContractorAcceptanceWorkflowAnswer,
  contractor_remark_response_draft: buildContractorAcceptanceWorkflowAnswer,
  document_pdf_evidence_linking: buildDocumentEvidenceWorkflowAnswer,
  document_payment_blocker_review: buildDocumentEvidenceWorkflowAnswer,
  marketplace_photo_product_draft: buildMarketplaceProductDraftWorkflowAnswer,
  marketplace_request_product_match: buildMarketplaceProductDraftWorkflowAnswer,
  office_stuck_work_review: buildOfficeStuckWorkWorkflowAnswer,
  client_progress_summary: buildClientProgressWorkflowAnswer,
};

export const AI_ROLE_WORKFLOW_PROOF_REQUESTS: AiRoleWorkflowRequest[] = [
  {
    workflowId: "director_daily_decision_queue",
    role: "director",
    screenId: "director",
    questionRu: "что мне решить сегодня",
  },
  {
    workflowId: "foreman_today_closeout",
    role: "foreman",
    screenId: "foreman",
    questionRu: "что мне закрыть сегодня",
  },
  {
    workflowId: "buyer_approved_request_to_purchase_draft",
    role: "buyer",
    screenId: "buyer",
    questionRu: "что купить по заявке №124",
  },
  {
    workflowId: "accountant_payment_readiness",
    role: "accountant",
    screenId: "accountant",
    questionRu: "какие платежи без документов",
  },
  {
    workflowId: "warehouse_item_trace",
    role: "warehouse",
    screenId: "warehouse",
    questionRu: "куда ушел ГКЛ",
  },
  {
    workflowId: "contractor_acceptance_closeout",
    role: "contractor",
    screenId: "contractor",
    questionRu: "что мешает закрыть мои работы",
  },
  {
    workflowId: "document_pdf_evidence_linking",
    role: "documents",
    screenId: "documents",
    questionRu: "с чем связан счет",
  },
  {
    workflowId: "marketplace_photo_product_draft",
    role: "marketplace_user",
    screenId: "market",
    questionRu: "подготовь карточку товара",
  },
  {
    workflowId: "office_stuck_work_review",
    role: "office",
    screenId: "office",
    questionRu: "кому напомнить",
  },
  {
    workflowId: "client_progress_summary",
    role: "client",
    screenId: "client",
    questionRu: "что сделано за неделю",
  },
];

export function answerAiRoleBusinessWorkflow(
  request: AiRoleWorkflowRequest,
  context = buildAiRoleWorkflowContext(),
): AiRoleWorkflowAnswer {
  const builder = AI_ROLE_WORKFLOW_ROUTER[request.workflowId];
  if (!builder) {
    throw new Error(`Unknown AI role workflow: ${request.workflowId}`);
  }
  return builder(context, request);
}

export function runAiRoleBusinessWorkflowSuite(
  context = buildAiRoleWorkflowContext(),
  requests: AiRoleWorkflowRequest[] = AI_ROLE_WORKFLOW_PROOF_REQUESTS,
): AiRoleWorkflowTrace[] {
  return requests.map((request) => {
    const answer = answerAiRoleBusinessWorkflow(request, context);
    const expectedNumericFacts = answer.facts
      .flatMap((fact) => fact.numericFacts ?? [])
      .map((fact) => ({
        key: fact.key,
        value: fact.value,
        unit: fact.unit,
        required: true,
      }));
    return {
      workflowId: answer.workflowId,
      role: answer.role as AiRoleWorkflowTrace["role"],
      questionRu: answer.questionRu,
      answer,
      safety: guardAiRoleWorkflowAnswer(answer),
      expectedNumericFacts,
    };
  });
}
