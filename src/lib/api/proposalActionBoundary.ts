import type { SupabaseClient } from "@supabase/supabase-js";

import { isProposalDirectorVisibleRow, normalizeProposalStatus } from "./proposals";

export type ProposalActionTerminalClass =
  | "success"
  | "denied"
  | "conflict"
  | "retryable_failure"
  | "terminal_failure";

export type SubmittedProposalServerTruth = {
  proposalId: string;
  status: string | null;
  submittedAt: string;
  sentToAccountantAt: string | null;
};

export type ApprovedProposalServerTruth = {
  proposalId: string;
  status: string | null;
  sentToAccountantAt: string;
};

export class ProposalActionBoundaryError extends Error {
  readonly terminalClass: ProposalActionTerminalClass;
  readonly action: "proposal_submit" | "director_approve";
  readonly stage: string;
  readonly causeError: unknown;

  constructor(params: {
    action: "proposal_submit" | "director_approve";
    stage: string;
    terminalClass: ProposalActionTerminalClass;
    message: string;
    causeError?: unknown;
  }) {
    super(params.message);
    this.name = "ProposalActionBoundaryError";
    this.action = params.action;
    this.stage = params.stage;
    this.terminalClass = params.terminalClass;
    this.causeError = params.causeError;
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const text = (value: unknown): string => String(value ?? "").trim();

const lowerErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.message.toLowerCase();
  const record = asRecord(error);
  if (!record) return text(error).toLowerCase();
  return [
    record.status,
    record.code,
    record.message,
    record.details,
    record.hint,
    record.error,
  ]
    .map(text)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export function classifyProposalActionFailure(error: unknown): ProposalActionTerminalClass {
  const record = asRecord(error);
  const status = text(record?.status);
  const code = text(record?.code);
  const haystack = lowerErrorText(error);

  if (
    status === "403" ||
    code === "42501" ||
    haystack.includes("permission") ||
    haystack.includes("forbidden") ||
    haystack.includes("denied") ||
    haystack.includes("policy")
  ) {
    return "denied";
  }

  if (
    status === "409" ||
    code === "409" ||
    code === "23505" ||
    haystack.includes("conflict") ||
    haystack.includes("duplicate") ||
    haystack.includes("already exists")
  ) {
    return "conflict";
  }

  const numericStatus = Number(status || code);
  if (
    numericStatus === 408 ||
    numericStatus === 429 ||
    (numericStatus >= 500 && numericStatus <= 599) ||
    haystack.includes("network") ||
    haystack.includes("timeout") ||
    haystack.includes("temporar") ||
    haystack.includes("fetch failed") ||
    haystack.includes("abort")
  ) {
    return "retryable_failure";
  }

  return "terminal_failure";
}

export function getProposalActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && text(error.message)) return text(error.message);
  const record = asRecord(error);
  if (record) {
    for (const key of ["message", "details", "hint", "code", "error"] as const) {
      const value = text(record[key]);
      if (value) return value;
    }
  }
  return text(error) || fallback;
}

export async function readbackSubmittedProposalTruth(
  supabase: SupabaseClient,
  proposalIds: string[],
): Promise<SubmittedProposalServerTruth[]> {
  const ids = Array.from(
    new Set(proposalIds.map((proposalId) => text(proposalId)).filter(Boolean)),
  );
  if (!ids.length) {
    throw new ProposalActionBoundaryError({
      action: "proposal_submit",
      stage: "readback",
      terminalClass: "terminal_failure",
      message: "proposal submit readback requires proposal id",
    });
  }

  const query = await supabase
    .from("proposals")
    .select("id,status,submitted_at,sent_to_accountant_at")
    .in("id", ids);
  if (query.error) {
    throw new ProposalActionBoundaryError({
      action: "proposal_submit",
      stage: "readback",
      terminalClass: classifyProposalActionFailure(query.error),
      message: getProposalActionErrorMessage(
        query.error,
        "proposal submit readback failed",
      ),
      causeError: query.error,
    });
  }

  const rows = Array.isArray(query.data) ? query.data : [];
  const byId = new Map<string, Record<string, unknown>>();
  rows.forEach((row) => {
    const record = asRecord(row);
    const id = text(record?.id);
    if (record && id) byId.set(id, record);
  });

  return ids.map((proposalId) => {
    const row = byId.get(proposalId);
    if (!row) {
      throw new ProposalActionBoundaryError({
        action: "proposal_submit",
        stage: "readback",
        terminalClass: "terminal_failure",
        message: `proposal submit readback missing proposal: ${proposalId}`,
      });
    }
    if (!isProposalDirectorVisibleRow(row)) {
      throw new ProposalActionBoundaryError({
        action: "proposal_submit",
        stage: "readback",
        terminalClass: "terminal_failure",
        message: `proposal submit not confirmed by server truth: ${proposalId}`,
      });
    }
    return {
      proposalId,
      status: text(row.status) || null,
      submittedAt: text(row.submitted_at),
      sentToAccountantAt: text(row.sent_to_accountant_at) || null,
    };
  });
}

export async function readbackApprovedProposalTruth(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<ApprovedProposalServerTruth> {
  const pid = text(proposalId);
  if (!pid) {
    throw new ProposalActionBoundaryError({
      action: "director_approve",
      stage: "readback",
      terminalClass: "terminal_failure",
      message: "director approve readback requires proposal id",
    });
  }

  const query = await supabase
    .from("proposals")
    .select("id,status,sent_to_accountant_at")
    .eq("id", pid)
    .maybeSingle();
  if (query.error) {
    throw new ProposalActionBoundaryError({
      action: "director_approve",
      stage: "readback",
      terminalClass: classifyProposalActionFailure(query.error),
      message: getProposalActionErrorMessage(
        query.error,
        "director approve readback failed",
      ),
      causeError: query.error,
    });
  }

  const row = asRecord(query.data);
  if (text(row?.id) !== pid) {
    throw new ProposalActionBoundaryError({
      action: "director_approve",
      stage: "readback",
      terminalClass: "terminal_failure",
      message: `director approve readback missing proposal: ${pid}`,
    });
  }

  const sentToAccountantAt = text(row.sent_to_accountant_at);
  if (!sentToAccountantAt) {
    throw new ProposalActionBoundaryError({
      action: "director_approve",
      stage: "readback",
      terminalClass: "terminal_failure",
      message: `director approve not confirmed by server truth: ${pid}`,
    });
  }

  return {
    proposalId: pid,
    status: text(row.status) || normalizeProposalStatus(row.status),
    sentToAccountantAt,
  };
}
