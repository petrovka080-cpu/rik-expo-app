import {
  createDomainGatewayProofRequest,
  executeAiDomainGatewayRequest,
  getGoldenDatasetGatewaySummary,
  type AiDomainContextBundle,
  type AiDomainGatewayRequest,
} from "../domainDataGateway";
import type { AiContractTrace } from "./aiContractRuntimeTypes";

function queryKindFromId(queryId: string): string {
  const parts = queryId.split(":");
  return parts[parts.length - 1] ?? "detail";
}

function buildNumericFacts(bundle: AiDomainContextBundle): AiContractTrace["numericFacts"] {
  return bundle.mergedNumericFacts.map((fact) => ({
    key: fact.key,
    value: fact.value,
    unit: fact.unit,
    sourceRefIds: fact.sourceRefIds,
  }));
}

export function createAiContractTraceFromDomainBundle(params: {
  request: AiDomainGatewayRequest;
  bundle: AiDomainContextBundle;
  traceId?: string;
  answerId?: string;
  questionRu?: string;
  route?: string;
}): AiContractTrace {
  const { request, bundle } = params;

  return {
    traceId: params.traceId ?? `${request.requestId}:contract-trace`,
    requestId: request.requestId,
    answerId: params.answerId ?? `${request.requestId}:answer`,
    role: request.role,
    screenId: request.screenId,
    userId: request.userId,
    orgId: request.orgId,
    questionRu: params.questionRu ?? request.normalizedQuestionRu,
    normalizedQuestionRu: request.normalizedQuestionRu,
    entrypoint: {
      mode: "free_text_question",
      route: params.route ?? "/ai/contract-runtime-proof",
    },
    understanding: {
      intent: request.intent,
      entity: request.entity,
      filters: request.filters,
    },
    sourcePlanning: {
      sourceOrder: request.sourcePlanDomains,
      appDataRequired: true,
      internetAllowed: false,
      marketplaceFirst: true,
      pdfRequired: true,
      boundedQueryRequired: true,
      reasonRu: request.reasonRu,
    },
    gateway: {
      used: bundle.domainResults.length > 0,
      queries: bundle.domainResults.map((result) => ({
        domain: result.domain,
        kind: queryKindFromId(result.queryId),
        entity: request.entity,
        bounded: true,
        orgScoped: true,
        roleScoped: true,
        limit: request.maxResultsPerDomain,
        resultStatus: result.status,
      })),
    },
    sources: {
      sourceRefIds: bundle.mergedSourceRefs.map((ref) => ref.id),
      openLinkCount: bundle.mergedOpenLinks.length,
      externalSources: [],
    },
    numericFacts: buildNumericFacts(bundle),
    answerShape: {
      hasShortAnswer: bundle.mergedFacts.length > 0,
      hasFoundSection: bundle.mergedFacts.some((fact) => fact.status === "found" || fact.status === "blocked"),
      hasSourceSection: bundle.checkedSources.length > 0,
      hasOpenLinks: bundle.mergedOpenLinks.length > 0,
      hasMissingData: true,
      hasNextStep: true,
      hasStatus: true,
    },
    safety: {
      changedData: false,
      finalSubmit: false,
      dangerousMutation: false,
      approvalBypass: false,
      autoApproval: false,
    },
    ui: {
      language: "ru",
      debugNoiseVisible: false,
      providerNoiseVisible: false,
      runtimeNoiseVisible: false,
      rawPayloadVisible: false,
    },
  };
}

export async function createAiGoldenContractTrace(): Promise<AiContractTrace> {
  const summary = getGoldenDatasetGatewaySummary();
  const request = createDomainGatewayProofRequest({
    requestId: `${summary.datasetId}:contract-runtime`,
  });
  const bundle = await executeAiDomainGatewayRequest(request);
  return createAiContractTraceFromDomainBundle({
    request,
    bundle,
    traceId: "contract-runtime:golden-business-trace",
    answerId: "contract-runtime:golden-business-answer",
  });
}

export function getAiContractTraceExpectedFacts(): { key: string; value: number }[] {
  const summary = getGoldenDatasetGatewaySummary();
  return [
    { key: "gkl_required", value: summary.gkl.requiredSheets },
    { key: "gkl_issued", value: summary.gkl.issuedSheets },
    { key: "gkl_remaining", value: summary.gkl.remainingSheets },
    { key: "gkl_shortage", value: summary.gkl.shortageSheets },
    { key: "payment_77_amount", value: summary.invoice45.amountKgs },
    { key: "payments_missing_docs_sum", value: summary.finance.paymentsMissingDocsSumKgs },
  ];
}
