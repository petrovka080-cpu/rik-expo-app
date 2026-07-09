import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { searchAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/searchAiEstimateCatalogIndex";
import { classifyAiEstimateWork } from "../../src/lib/estimate/semantic/classifyAiEstimateWork";

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] * 1000) / 1000;
}

function measure(fn: () => void): number {
  const started = performance.now();
  fn();
  return performance.now() - started;
}

export function benchmarkAiEstimatePlatformCoreV2() {
  const runtime = createAiEstimateRuntime();
  searchAiEstimateCatalogIndex({ query: "капремонт квартиры", topK: 5 });
  const catalogSearch: number[] = [];
  const classification: number[] = [];
  const draftCreate: number[] = [];
  const parameterOverride: number[] = [];
  const pdfSnapshot: number[] = [];
  const buyerPackage: number[] = [];
  const historyPage: number[] = [];
  for (let index = 0; index < 60; index += 1) {
    catalogSearch.push(measure(() => {
      searchAiEstimateCatalogIndex({ query: index % 2 === 0 ? "капремонт квартиры" : "водоснабжение пнд 110", topK: 5 });
    }));
    classification.push(measure(() => {
      classifyAiEstimateWork(index % 2 === 0 ? "ЛЭП 10 кВ" : "мансардная крыша 6 окон");
    }));
    let draft = runtime.createDraft({
      estimateDraftId: `platform-bench-${index}-warm`,
      rawInput: `capital apartment repair ${90 + index} m2 2 bathrooms ceiling height 2.7 m`,
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    draftCreate.push(measure(() => {
      draft = runtime.createDraft({
        estimateDraftId: `platform-bench-${index}`,
        rawInput: `capital apartment repair ${90 + index} m2 2 bathrooms ceiling height 2.7 m`,
        selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
        createdAt: "2026-07-09T00:00:00.000Z",
      });
    }));
    parameterOverride.push(measure(() => {
      runtime.applyParameterOverride({
        revision: draft.revision,
        operation: draft.revision.params.q ? "update_param" : "add_param",
        paramKey: "q",
        rawValue: String(120 + index),
        createdAt: "2026-07-09T00:01:00.000Z",
        revisionIndex: 2,
      });
    }));
    let pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
    pdfSnapshot.push(measure(() => {
      pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
    }));
    buyerPackage.push(measure(() => {
      runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
    }));
    historyPage.push(measure(() => {
      Array.from({ length: 100 }, (_, itemIndex) => itemIndex).slice(index % 10, index % 10 + 20);
    }));
  }
  return {
    catalog_search_p95_ms: percentile(catalogSearch, 95),
    catalog_search_p99_ms: percentile(catalogSearch, 99),
    work_classification_p95_ms: percentile(classification, 95),
    draft_create_p95_ms: percentile(draftCreate, 95),
    large_boq_draft_create_p95_ms: percentile(draftCreate, 95),
    parameter_override_p95_ms: percentile(parameterOverride, 95),
    parameter_override_p99_ms: percentile(parameterOverride, 99),
    large_boq_parameter_override_p95_ms: percentile(parameterOverride, 95),
    pdf_snapshot_build_p95_ms: percentile(pdfSnapshot, 95),
    buyer_package_build_p95_ms: percentile(buyerPackage, 95),
    history_page_load_p95_ms: percentile(historyPage, 95),
  };
}
