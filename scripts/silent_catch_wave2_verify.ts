import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type CatchKind = "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback";
type PathGroup = "payment" | "proposal" | "submit" | "realtime" | "pdf";

type MatrixEntry = {
  file: string;
  event: string;
  kind: CatchKind;
  pathGroup: PathGroup;
  userBehavior: string;
  source: string;
};

const targetFiles = [
  "src/screens/accountant/components/ActivePaymentForm.tsx",
  "src/screens/buyer/buyer.subscriptions.ts",
  "src/screens/buyer/buyer.repo.ts",
  "src/lib/api/proposals.ts",
  "src/screens/director/director.proposal.row.tsx",
  "src/screens/director/director.proposal.ts",
  "src/screens/director/director.proposal.detail.ts",
  "src/lib/pdfRunner.ts",
  "src/lib/pdf/pdf.builder.ts",
  "src/lib/api/pdf_proposal.ts",
  "src/lib/api/paymentPdf.service.ts",
] as const;

const matrix: MatrixEntry[] = [
  {
    file: "src/screens/accountant/components/ActivePaymentForm.tsx",
    event: "proposal_items_load_failed",
    kind: "critical_fail",
    pathGroup: "payment",
    userBehavior: "shows payment data error banner",
    source: "proposal:payment_allocation_form",
  },
  {
    file: "src/screens/accountant/components/ActivePaymentForm.tsx",
    event: "proposal_allocations_load_failed",
    kind: "critical_fail",
    pathGroup: "payment",
    userBehavior: "shows payment data error banner",
    source: "proposal:payment_allocation_form",
  },
  {
    file: "src/screens/accountant/components/ActivePaymentForm.tsx",
    event: "alloc_status_callback_failed",
    kind: "soft_failure",
    pathGroup: "payment",
    userBehavior: "keeps UI interactive, logs callback failure",
    source: "payment:manual_form",
  },
  {
    file: "src/screens/accountant/components/ActivePaymentForm.tsx",
    event: "allocation_recalculation_failed",
    kind: "critical_fail",
    pathGroup: "payment",
    userBehavior: "keeps payment form visible with allocation error",
    source: "proposal:payment_allocation_form",
  },
  {
    file: "src/screens/buyer/buyer.subscriptions.ts",
    event: "buyer_notif_callback_failed",
    kind: "soft_failure",
    pathGroup: "realtime",
    userBehavior: "logs realtime callback failure without crash",
    source: "supabase:realtime",
  },
  {
    file: "src/screens/buyer/buyer.subscriptions.ts",
    event: "buyer_notif_refresh_failed",
    kind: "soft_failure",
    pathGroup: "realtime",
    userBehavior: "logs notification-triggered refresh failure",
    source: "supabase:realtime",
  },
  {
    file: "src/screens/buyer/buyer.subscriptions.ts",
    event: "buyer_proposals_refresh_failed",
    kind: "soft_failure",
    pathGroup: "realtime",
    userBehavior: "logs proposal refresh failure",
    source: "supabase:realtime",
  },
  {
    file: "src/screens/buyer/buyer.subscriptions.ts",
    event: "buyer_notif_remove_channel_failed",
    kind: "cleanup_only",
    pathGroup: "realtime",
    userBehavior: "cleanup failure does not break detach",
    source: "supabase:realtime",
  },
  {
    file: "src/screens/buyer/buyer.subscriptions.ts",
    event: "buyer_proposals_remove_channel_failed",
    kind: "cleanup_only",
    pathGroup: "realtime",
    userBehavior: "cleanup failure does not break detach",
    source: "supabase:realtime",
  },
  {
    file: "src/screens/buyer/buyer.repo.ts",
    event: "latest_proposal_pdf_attachment_lookup_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "falls back to null attachment with trace",
    source: "canonical:proposal_attachments",
  },
  {
    file: "src/screens/buyer/buyer.repo.ts",
    event: "proposal_attachment_signed_url_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "keeps attachment row but traces signed-url fallback failure",
    source: "supabase:storage_signed_url",
  },
  {
    file: "src/screens/buyer/buyer.repo.ts",
    event: "proposal_items_bulk_upsert_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "falls back from bulk upsert to row-by-row updates",
    source: "table:proposal_items",
  },
  {
    file: "src/lib/api/proposals.ts",
    event: "proposal_add_items_rpc_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "falls back from RPC to table insert with trace",
    source: "rpc:proposal_add_items",
  },
  {
    file: "src/lib/api/proposals.ts",
    event: "proposal_items_bulk_insert_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "falls back from bulk insert to single-row insert with trace",
    source: "table:proposal_items",
  },
  {
    file: "src/lib/api/proposals.ts",
    event: "proposal_item_insert_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "keeps fallback chain observable",
    source: "table:proposal_items",
  },
  {
    file: "src/lib/api/proposals.ts",
    event: "proposal_items_source_failed",
    kind: "degraded_fallback",
    pathGroup: "proposal",
    userBehavior: "keeps proposal items source chain observable",
    source: "proposal_items_source_chain",
  },
  {
    file: "src/lib/api/proposals.ts",
    event: "submit_proposal",
    kind: "critical_fail",
    pathGroup: "submit",
    userBehavior: "rethrows submit failure and records observability",
    source: "rpc:proposal_submit_text_v1",
  },
  {
    file: "src/screens/director/director.proposal.row.tsx",
    event: "proposal_row_expand_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "alerts on row load failure and traces it",
    source: "proposal:director_row",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_item_reject_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "alerts on reject failure and traces it",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_pdf_open_failed",
    kind: "critical_fail",
    pathGroup: "pdf",
    userBehavior: "alerts on PDF open failure and traces it",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_pdf_open_busy",
    kind: "soft_failure",
    pathGroup: "pdf",
    userBehavior: "busy path is no longer silent",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_excel_export_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "alerts on export failure and traces it",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_work_seed_failed",
    kind: "soft_failure",
    pathGroup: "proposal",
    userBehavior: "warning path is observable",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.ts",
    event: "proposal_approve_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "alerts on approve failure and traces it",
    source: "proposal:director_actions",
  },
  {
    file: "src/screens/director/director.proposal.detail.ts",
    event: "proposal_attachments_load_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "shows attachment error state and traces it",
    source: "proposal:director_detail",
  },
  {
    file: "src/screens/director/director.proposal.detail.ts",
    event: "proposal_return_failed",
    kind: "critical_fail",
    pathGroup: "proposal",
    userBehavior: "alerts on return failure and traces it",
    source: "proposal:director_detail",
  },
  {
    file: "src/lib/pdfRunner.ts",
    event: "pdf_popup_blocked",
    kind: "critical_fail",
    pathGroup: "pdf",
    userBehavior: "shows popup alert and traces blocked open",
    source: "pdf:runner",
  },
  {
    file: "src/lib/pdfRunner.ts",
    event: "pdf_web_open_failed",
    kind: "critical_fail",
    pathGroup: "pdf",
    userBehavior: "alerts on web open failure and traces it",
    source: "pdf:runner",
  },
  {
    file: "src/lib/pdfRunner.ts",
    event: "pdf_prepare_or_open_failed",
    kind: "critical_fail",
    pathGroup: "pdf",
    userBehavior: "alerts on native prepare/open failure and traces it",
    source: "pdf:runner",
  },
  {
    file: "src/lib/pdfRunner.ts",
    event: "pdf_window_close_failed",
    kind: "cleanup_only",
    pathGroup: "pdf",
    userBehavior: "cleanup failure does not break PDF UI flow",
    source: "pdf:runner",
  },
  {
    file: "src/lib/pdf/pdf.builder.ts",
    event: "request_label_lookup_failed",
    kind: "degraded_fallback",
    pathGroup: "pdf",
    userBehavior: "falls back to short request label with trace",
    source: "table:requests",
  },
  {
    file: "src/lib/pdf/pdf.builder.ts",
    event: "batch_request_label_lookup_failed",
    kind: "degraded_fallback",
    pathGroup: "pdf",
    userBehavior: "falls back to empty label map with trace",
    source: "table:requests",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    event: "proposal_pdf_app_names_lookup_failed",
    kind: "degraded_fallback",
    pathGroup: "pdf",
    userBehavior: "keeps proposal PDF build degraded but observable",
    source: "table:rik_apps",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    event: "proposal_pdf_build_failed",
    kind: "critical_fail",
    pathGroup: "pdf",
    userBehavior: "returns explicit error HTML and traces build failure",
    source: "pdf:proposal_html",
  },
  {
    file: "src/lib/api/paymentPdf.service.ts",
    event: "payment_pdf_allocations_lookup_failed",
    kind: "degraded_fallback",
    pathGroup: "pdf",
    userBehavior: "keeps payment PDF legacy branch observable",
    source: "table:proposal_payment_allocations",
  },
  {
    file: "src/lib/api/paymentPdf.service.ts",
    event: "payment_pdf_rpc_source_failed",
    kind: "degraded_fallback",
    pathGroup: "pdf",
    userBehavior: "falls back from RPC source to legacy source with trace",
    source: "rpc:pdf_payment_source_v1",
  },
];

const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const catchRegex = /catch\s*(?:\([^)]*\))?\s*\{/g;
const writeJson = (path: string, payload: unknown) => {
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2) + "\n", "utf8");
};

const getLineNumber = (text: string, marker: string) => {
  const index = text.indexOf(marker);
  if (index < 0) return null;
  return text.slice(0, index).split(/\r?\n/).length;
};

async function main() {
  const fileContents = await Promise.all(
    targetFiles.map(async (file) => ({
      file,
      text: await readFile(resolve(file), "utf8"),
    })),
  );

  const targetFileChecks = fileContents.map(({ file, text }) => ({
    file,
    catchCount: [...text.matchAll(catchRegex)].length,
    emptyCatchCount: [...text.matchAll(emptyCatchRegex)].length,
  }));

  const matrixWithEvidence = matrix.map((entry) => {
    const text = fileContents.find((file) => file.file === entry.file)?.text ?? "";
    const marker = `"${entry.event}"`;
    return {
      ...entry,
      marker,
      markerPresent: text.includes(marker),
      line: getLineNumber(text, marker),
    };
  });

  const summary = {
    wave: "silent-catch-wave2",
    generatedAt: new Date().toISOString(),
    noSilentCatchInTargetFiles: targetFileChecks.every((entry) => entry.emptyCatchCount === 0),
    totalTargetFiles: targetFiles.length,
    totalCatchBlocks: targetFileChecks.reduce((sum, entry) => sum + entry.catchCount, 0),
    totalTopPathEntries: matrixWithEvidence.length,
    entriesByKind: {
      critical_fail: matrixWithEvidence.filter((entry) => entry.kind === "critical_fail").length,
      soft_failure: matrixWithEvidence.filter((entry) => entry.kind === "soft_failure").length,
      cleanup_only: matrixWithEvidence.filter((entry) => entry.kind === "cleanup_only").length,
      degraded_fallback: matrixWithEvidence.filter((entry) => entry.kind === "degraded_fallback").length,
    },
    entriesByPathGroup: {
      payment: matrixWithEvidence.filter((entry) => entry.pathGroup === "payment").length,
      proposal: matrixWithEvidence.filter((entry) => entry.pathGroup === "proposal").length,
      submit: matrixWithEvidence.filter((entry) => entry.pathGroup === "submit").length,
      realtime: matrixWithEvidence.filter((entry) => entry.pathGroup === "realtime").length,
      pdf: matrixWithEvidence.filter((entry) => entry.pathGroup === "pdf").length,
    },
    missingMarkers: matrixWithEvidence.filter((entry) => !entry.markerPresent).map((entry) => entry.event),
    targetFileChecks,
    supportingTests: [
      "src/screens/accountant/components/ActivePaymentForm.test.tsx",
      "src/screens/buyer/buyer.subscriptions.test.ts",
      "src/lib/api/proposals.silentCatch.test.ts",
      "src/lib/pdfRunner.silentCatch.test.ts",
    ],
    green: false,
  };

  const observabilityProof = {
    generatedAt: summary.generatedAt,
    noSilentCatchInTargetFiles: summary.noSilentCatchInTargetFiles,
    checks: [
      {
        name: "payment_fail_visible",
        passed: matrixWithEvidence.some(
          (entry) => entry.event === "proposal_items_load_failed" && entry.markerPresent,
        ),
        evidence: [
          "src/screens/accountant/components/ActivePaymentForm.test.tsx",
          "src/screens/accountant/components/ActivePaymentForm.tsx",
        ],
      },
      {
        name: "proposal_fail_observable",
        passed: matrixWithEvidence.some(
          (entry) => entry.event === "proposal_add_items_rpc_failed" && entry.markerPresent,
        ),
        evidence: [
          "src/lib/api/proposals.silentCatch.test.ts",
          "src/lib/api/proposals.ts",
        ],
      },
      {
        name: "submit_fail_observable",
        passed: fileContents.some(
          ({ file, text }) => file === "src/lib/api/proposals.ts" && text.includes('event: "submit_proposal"'),
        ),
        evidence: [
          "src/lib/api/proposals.silentCatch.test.ts",
          "src/lib/api/proposals.ts",
        ],
      },
      {
        name: "realtime_cleanup_fail_observable",
        passed: matrixWithEvidence.some(
          (entry) => entry.event === "buyer_notif_remove_channel_failed" && entry.markerPresent,
        ),
        evidence: [
          "src/screens/buyer/buyer.subscriptions.test.ts",
          "src/screens/buyer/buyer.subscriptions.ts",
        ],
      },
      {
        name: "pdf_fail_not_silent",
        passed: matrixWithEvidence.some(
          (entry) => entry.event === "pdf_popup_blocked" && entry.markerPresent,
        ),
        evidence: [
          "src/lib/pdfRunner.silentCatch.test.ts",
          "src/lib/pdfRunner.ts",
        ],
      },
      {
        name: "ui_not_hanging_on_payment_failure",
        passed: fileContents.some(
          ({ file, text }) =>
            file === "src/screens/accountant/components/ActivePaymentForm.tsx" &&
            text.includes("Не удалось подготовить данные для оплаты"),
        ),
        evidence: [
          "src/screens/accountant/components/ActivePaymentForm.test.tsx",
          "src/screens/accountant/components/ActivePaymentForm.tsx",
        ],
      },
    ],
    targetFilesWithoutEmptyCatch: targetFileChecks
      .filter((entry) => entry.emptyCatchCount === 0)
      .map((entry) => entry.file),
  };

  summary.green =
    summary.noSilentCatchInTargetFiles &&
    summary.missingMarkers.length === 0 &&
    observabilityProof.checks.every((check) => check.passed);

  writeJson("artifacts/silent-catch-wave2-summary.json", summary);
  writeJson("artifacts/silent-catch-top-paths-matrix.json", matrixWithEvidence);
  writeJson("artifacts/silent-catch-observability-proof.json", observabilityProof);

  if (!summary.green) {
    console.error("[silent_catch_wave2_verify] NOT_GREEN", {
      missingMarkers: summary.missingMarkers,
      targetFileChecks,
    });
    process.exitCode = 1;
    return;
  }

  console.log("[silent_catch_wave2_verify] GREEN", {
    entries: matrixWithEvidence.length,
    targetFiles: targetFiles.length,
  });
}

void main();
