import { getAiGoldenBusinessDataset } from "../../evaluation/goldenBusinessDataset";

export function getGoldenDatasetGatewaySummary() {
  const dataset = getAiGoldenBusinessDataset();
  return {
    datasetId: dataset.datasetId,
    productionData: false,
    request124: dataset.procurement.mainRequest,
    gkl: dataset.warehouse.gkl,
    finance: {
      paymentsMissingDocsCount: dataset.finance.paymentsMissingDocsCount,
      paymentsMissingDocsSumKgs: dataset.finance.paymentsMissingDocsSumKgs,
    },
    invoice45: dataset.documents.pdfInvoice45,
  };
}
