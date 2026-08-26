import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateRevision,
  searchCanonicalEstimateCatalog,
} from "../../../estimate/backendPlatform/canonicalEstimateClient";
import { canonicalWorkSearchQueryFromPrompt } from "../../../estimate/backendPlatform/canonicalEstimateSearchInput";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateSearchItem,
  CanonicalEstimateSearchPage,
} from "../../../estimate/backendPlatform/contracts";
import type { AiRunResult } from "../../kernel/AiRuntimeKernelContract";
import type { AiEstimatePlugin } from "./AiEstimatePluginContract";

function defaultParameters(catalog: CanonicalEstimateCatalogItem) {
  const missing: string[] = [];
  const parameters: Record<string, string | number | boolean> = {};
  for (const definition of catalog.parameterSchema) {
    if (definition.defaultValue == null) {
      if (definition.required) missing.push(definition.titleRu);
      continue;
    }
    if (typeof definition.defaultValue === "string" || typeof definition.defaultValue === "number" || typeof definition.defaultValue === "boolean") {
      parameters[definition.parameterId] = definition.defaultValue;
    }
  }
  return { parameters, missing };
}

function failed(flowId: string, error: unknown): AiRunResult {
  return {
    flowId,
    status: "failed",
    userVisibleAnswerRu: error instanceof Error ? error.message : "Backend сметы временно недоступен.",
  };
}

export function selectExactProfessionalCanonicalItem(
  search: Pick<CanonicalEstimateSearchPage, "items" | "literalTotalCount">,
): CanonicalEstimateSearchItem | null {
  const exact = search.items.filter((item) =>
    (item.matchType === "T1_EXACT" || item.matchType === "T2_EXACT_ALIAS")
    && item.publicationState === "ADMITTED_BACKEND"
    && item.selectableMode === "PROFESSIONAL"
    && item.estimateReady
    && item.contentAdmission?.allowed === true);
  return search.literalTotalCount === 1 && exact.length === 1
    ? exact[0]
    : null;
}

export function createAiEstimatePlugin(): AiEstimatePlugin {
  return {
    pluginId: "ai_estimate",
    async run(input) {
      const runInput = input.runInput;
      if (runInput.mode === "forbidden") return {
        flowId: runInput.flowId,
        status: "forbidden",
        userVisibleAnswerRu: "Действие AI запрещено по политике.",
      };
      try {
        if (runInput.mode === "safe_read") {
          if (!runInput.contextRef?.revisionId) return {
            flowId: runInput.flowId,
            status: "needs_more_input",
            userVisibleAnswerRu: "Укажите backend revision_id сметы, которую нужно открыть.",
          };
          const revision = await getCanonicalEstimateRevision(runInput.contextRef.revisionId);
          return {
            flowId: runInput.flowId,
            status: "completed",
            userVisibleAnswerRu: "Сохранённая версия сметы открыта без пересчёта.",
            draft: { backendCanonical: true, revision },
          };
        }
        const query = String(runInput.userText ?? runInput.intent).trim();
        const searchQuery = canonicalWorkSearchQueryFromPrompt(query);
        const search = await searchCanonicalEstimateCatalog({
          query: searchQuery,
          mode: "PHRASE",
          pageSize: 50,
        });
        const exact = selectExactProfessionalCanonicalItem(search);
        if (!exact) return {
          flowId: runInput.flowId,
          status: "needs_more_input",
          userVisibleAnswerRu: search.items.length
            ? `Выберите точную работу из каталога: ${search.items.map((item) => item.canonicalNameRu).join("; ")}.`
            : "Работа не найдена в каталоге. Уточните вид работ.",
          draft: { backendCanonical: true, admitted: false, suggestions: search.items },
        };
        const catalog = await getCanonicalEstimateCatalogItem(exact.catalogId);
        const defaults = defaultParameters(catalog);
        if (defaults.missing.length) return {
          flowId: runInput.flowId,
          status: "needs_more_input",
          userVisibleAnswerRu: `Заполните параметры: ${defaults.missing.slice(0, 8).join("; ")}.`,
          draft: { backendCanonical: true, admitted: false, catalog, missingParameters: defaults.missing },
        };
        if (runInput.mode === "approval_required") return {
          flowId: runInput.flowId,
          status: "needs_approval",
          userVisibleAnswerRu: `Подтвердите создание черновика сметы: ${catalog.titleRu}.`,
          draft: { backendCanonical: true, admitted: false, catalogId: catalog.catalogId, parameters: defaults.parameters },
        };
        const result = await compileCanonicalEstimateAndLoad({
          request: {
            idempotencyKey: `ai-plugin-${runInput.flowId}-${catalog.catalogId}`.slice(0, 200),
            catalogId: catalog.catalogId,
            sourceRequestText: query,
            primaryMeasureParameterId: catalog.parameterSchema
              .find((parameter) => parameter.visibilityRole == null || parameter.visibilityRole === "USER_INPUT")
              ?.parameterId ?? catalog.parameterSchema[0]?.parameterId ?? "quantity",
            parameters: defaults.parameters,
            currencyCode: "KGS",
          },
        });
        return {
          flowId: runInput.flowId,
          status: "completed",
          userVisibleAnswerRu: "Профессиональный черновик сметы создан.",
          draft: {
            backendCanonical: true,
            catalog,
            revision: result.revision,
            rows: result.rows,
          },
        };
      } catch (error) {
        return failed(runInput.flowId, error);
      }
    },
  };
}
