import type { AiAppEntityType, AiSourceRef } from "../appContextGraph";
import {
  findAiGoldenSourceRef,
  getAiGoldenBusinessDataset,
  type AiGoldenBusinessDataset,
} from "../evaluation/goldenBusinessDataset";
import type { AiRoleWorkflowAnswer, AiRoleWorkflowContext } from "./aiRoleWorkflowTypes";

function requiredRef(
  dataset: AiGoldenBusinessDataset,
  entityType: AiAppEntityType,
  entityId: string,
): AiSourceRef {
  const ref = findAiGoldenSourceRef(dataset, entityType, entityId);
  if (!ref) {
    throw new Error(`Missing golden source ref ${entityType}:${entityId}`);
  }
  return ref;
}

export function buildAiRoleWorkflowContext(
  dataset = getAiGoldenBusinessDataset(),
): AiRoleWorkflowContext {
  return {
    dataset,
    sourceRefs: dataset.sourceRefs,
    sourceRefIds: {
      request124: requiredRef(dataset, "procurement_request", "req_124").id,
      workGkl: requiredRef(dataset, "work", "work_31").id,
      workElectrical: requiredRef(dataset, "work", "work_32").id,
      workPlaster: requiredRef(dataset, "work", "work_33").id,
      workWaterproofing: requiredRef(dataset, "work", "work_34").id,
      warehouseIssue: requiredRef(dataset, "warehouse_issue", "warehouse_issue_88").id,
      warehouseStock: requiredRef(dataset, "warehouse_stock", "warehouse_stock_gkl").id,
      payment77: requiredRef(dataset, "payment", "payment_77").id,
      payment78: requiredRef(dataset, "payment", "payment_78").id,
      payment79: requiredRef(dataset, "payment", "payment_79").id,
      pdfInvoice45: requiredRef(dataset, "pdf_document", "pdf_invoice_45").id,
      invoice45: requiredRef(dataset, "invoice", "invoice_45").id,
      marketplaceProduct: requiredRef(dataset, "marketplace_product", "market_product_gkl_12_5").id,
      supplier: requiredRef(dataset, "supplier", "supplier_stroymat").id,
      contractor: requiredRef(dataset, "contractor", "contractor_golden").id,
      clientReport: requiredRef(dataset, "report", "client_weekly_report").id,
    },
  };
}

export function makeAiRoleWorkflowOpenLink(
  context: AiRoleWorkflowContext,
  sourceRefId: string,
): AiRoleWorkflowAnswer["openLinks"][number] {
  const ref = context.sourceRefs.find((item) => item.id === sourceRefId);
  return {
    labelRu: ref?.labelRu ?? sourceRefId,
    sourceRefId,
    enabled: Boolean(ref?.appLink && ref.permission.canOpen),
    route: ref?.appLink?.route,
    disabledReasonRu: ref?.permission.canOpen ? undefined : ref?.permission.reasonRu,
  };
}

export function makeAiRoleWorkflowOpenLinks(
  context: AiRoleWorkflowContext,
  sourceRefIds: readonly string[],
): AiRoleWorkflowAnswer["openLinks"] {
  const seen = new Set<string>();
  return sourceRefIds
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => makeAiRoleWorkflowOpenLink(context, id));
}
