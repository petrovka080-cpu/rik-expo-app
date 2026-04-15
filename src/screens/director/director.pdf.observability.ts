/**
 * D-MODAL-PDF: Director-specific PDF observability.
 *
 * Records focused breadcrumbs for each director PDF entry point to surface
 * exact segment timing in production without modifying the actual PDF flow.
 *
 * This file is intentionally lightweight — each call is fire-and-forget
 * and never blocks the critical path.
 */

import { recordPlatformObservability } from "../../lib/observability/platformObservability";

export type DirectorPdfEntryPointId =
  | "request_pdf"
  | "proposal_pdf"
  | "finance_management_report_pdf"
  | "finance_supplier_summary_pdf"
  | "reports_production_pdf"
  | "reports_subcontract_pdf";

export type DirectorPdfSegment =
  | "tap_start"
  | "descriptor_build_start"
  | "descriptor_build_done"
  | "prepare_and_preview_start"
  | "prepare_and_preview_done"
  | "prepare_and_preview_error";

export function recordDirectorPdfEntryPoint(args: {
  entryPoint: DirectorPdfEntryPointId;
  segment: DirectorPdfSegment;
  durationMs?: number;
  result: "start" | "success" | "error";
  error?: unknown;
  extra?: Record<string, unknown>;
}): void {
  const errorMessage =
    args.error instanceof Error
      ? args.error.message.trim()
      : args.error
        ? String(args.error).trim()
        : undefined;

  recordPlatformObservability({
    screen: "director",
    surface: "director_pdf_entry_point",
    category: "ui",
    event: `director_pdf:${args.entryPoint}:${args.segment}`,
    result: args.result === "error" ? "error" : "success",
    durationMs: args.durationMs ?? 0,
    sourceKind: `pdf:director:${args.entryPoint}`,
    errorStage: args.result === "error" ? args.segment : undefined,
    errorMessage,
    extra: {
      entryPoint: args.entryPoint,
      segment: args.segment,
      ...args.extra,
    },
  });
}
