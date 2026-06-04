import * as fs from "fs";
import * as path from "path";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";

const artifactsDir = path.resolve(process.cwd(), "artifacts");

function writeArtifact(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  __resetConsumerRepairRequestStoreForTests();
  const screen = [
    "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
    "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx",
  ].map((filePath) => fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8")).join("\n");
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "consumer_estimate_tab_pdf",
    problemText: "Нужно сделать смету на ремонт пола и сохранить PDF.",
    repairType: "Пол",
    aiDraft: {
      titleRu: "Смета на пол",
      summaryRu: "Материалы и работы подготовлены.",
      repairType: "Пол",
      items: [{ itemType: "work", titleRu: "Укладка ламината", quantity: 100, unit: "м²", source: "ai_suggested" }],
      missingData: ["город"],
      dangerousDiyBlocked: false,
    },
  });
  const withPdf = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: "consumer_estimate_tab_pdf",
  });
  const opened = getConsumerRepairRequestPdf({ requestDraftId: withPdf.draft.id });
  const history = listConsumerRepairRequestHistory("consumer_estimate_tab_pdf");
  const trace = {
    screen_title_estimate: screen.includes('title="Смета"'),
    make_pdf_action_visible: screen.includes('testID="consumer-estimate-make-pdf"'),
    existing_viewer_boundary_used: screen.includes('pathname: "/pdf-viewer"'),
    pdf_generated: withPdf.pdfs[0]?.pdfStatus === "generated",
    pdf_opened: opened.signedUrl.startsWith("data:application/pdf"),
    history_row_visible: history[0]?.pdfs.length === 1,
    marketplace_auto_send_found: withPdf.marketplaceLink.status !== "not_sent",
    consumer_office_leak_found: /warehouse|finance|company/i.test(screen),
  };
  writeArtifact("S_AI_ESTIMATE_TO_PDF_consumer_tab_trace.json", trace);
  if (!trace.screen_title_estimate || !trace.make_pdf_action_visible || !trace.existing_viewer_boundary_used || !trace.pdf_generated || !trace.pdf_opened || !trace.history_row_visible) {
    throw new Error(`Consumer estimate tab PDF proof failed: ${JSON.stringify(trace)}`);
  }
  if (trace.marketplace_auto_send_found || trace.consumer_office_leak_found) {
    throw new Error(`Consumer estimate tab PDF safety proof failed: ${JSON.stringify(trace)}`);
  }
  console.log("GREEN_CONSUMER_ESTIMATE_TAB_PDF_PROOF_READY");
}

main();
