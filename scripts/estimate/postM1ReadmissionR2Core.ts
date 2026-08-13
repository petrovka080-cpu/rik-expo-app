import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type JsonRecord = Record<string, any>;

export function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableJson(value: any): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function stableJsonLine(value: any): string {
  return JSON.stringify(stableValue(value));
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function setHash(values: readonly string[]): string {
  return sha256(`${[...new Set(values)].sort().join("\n")}\n`);
}

export function readJson(file: string): any {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function readJsonl(file: string): JsonRecord[] {
  return readFileSync(file, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

export function parseCsv(text: string): JsonRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/u, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/u, "")); rows.push(row); }
  const [headers, ...data] = rows.filter((entry) => entry.some((value) => value.length > 0));
  return data.map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index] ?? ""])));
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

export function csv(rows: readonly JsonRecord[], columns: readonly string[]): string {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

export function writeDeterministic(root: string, relative: string, content: string | Buffer): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export type R2ValidationState = {
  predecessorVerdict: "GREEN" | "RED";
  greenRootCount: number;
  tokenHeadMatches: boolean;
  manifestMatches: boolean;
  contractExcludedLineCount: number;
  placeholders: number;
  auditorTargetWrites: number;
  repairerVerdictWrites: number;
  nonAsphaltContentChanges: number;
  r63Cases: number;
  globalAsphalt: number;
  externalBenchmark: number;
  externalInGlobal: number;
  m5Count: number;
  cumulativeCount: number;
  remainingCount: number;
  globalUnion: number;
  globalIntersection: number;
  globalUnassigned: number;
  draftActiveOwners: number;
  textCarrierOwnsKgStatus: boolean;
  foreignPromotedToKgMandatory: number;
  rowTraceMissing: number;
  dispositionMissing: number;
  jurisdictionCellMissing: number;
  roadProofRebound: number;
  durableProjectionLoss: number;
  successorSelectedGroups: number;
  trackedSelfReferenceRequired: boolean;
  finalWorktreeClean: boolean;
  mixedShaEvidence: number;
};

export const GREEN_R2_STATE: R2ValidationState = Object.freeze({
  predecessorVerdict: "GREEN", greenRootCount: 1, tokenHeadMatches: true, manifestMatches: true,
  contractExcludedLineCount: 1, placeholders: 0, auditorTargetWrites: 0, repairerVerdictWrites: 0,
  nonAsphaltContentChanges: 0, r63Cases: 63, globalAsphalt: 55, externalBenchmark: 8,
  externalInGlobal: 0, m5Count: 4005, cumulativeCount: 4060, remainingCount: 7550,
  globalUnion: 11610, globalIntersection: 0, globalUnassigned: 0, draftActiveOwners: 0,
  textCarrierOwnsKgStatus: false, foreignPromotedToKgMandatory: 0, rowTraceMissing: 0,
  dispositionMissing: 0, jurisdictionCellMissing: 0, roadProofRebound: 0, durableProjectionLoss: 0,
  successorSelectedGroups: 0, trackedSelfReferenceRequired: false, finalWorktreeClean: true,
  mixedShaEvidence: 0,
});

export function validateR2State(state: R2ValidationState): string[] {
  const errors: string[] = [];
  if (state.predecessorVerdict !== "GREEN") errors.push("RED_PREDECESSOR_ACCEPTED");
  if (state.greenRootCount !== 1) errors.push("GREEN_ROOT_AMBIGUITY");
  if (!state.tokenHeadMatches) errors.push("TOKEN_HEAD_MISMATCH");
  if (!state.manifestMatches) errors.push("MANIFEST_BYTE_MISMATCH");
  if (state.contractExcludedLineCount !== 1) errors.push("CONTRACT_CANONICAL_EXCLUSION_INVALID");
  if (state.placeholders !== 0) errors.push("PLACEHOLDER_PRESENT");
  if (state.auditorTargetWrites !== 0) errors.push("AUDITOR_TARGET_MUTATION");
  if (state.repairerVerdictWrites !== 0) errors.push("REPAIRER_AUDIT_VERDICT_MUTATION");
  if (state.nonAsphaltContentChanges !== 0) errors.push("NON_ASPHALT_CONTENT_MUTATION");
  if (state.r63Cases !== 63 || state.globalAsphalt !== 55 || state.externalBenchmark !== 8 || state.externalInGlobal !== 0) errors.push("R63_GLOBAL_EXTERNAL_PARTITION_INVALID");
  if (state.m5Count !== 4005 || state.cumulativeCount !== 4060 || state.remainingCount !== 7550) errors.push("STALE_4068_7542_ARITHMETIC");
  if (state.globalUnion !== 11610 || state.globalIntersection !== 0 || state.globalUnassigned !== 0) errors.push("GLOBAL_MEMBER_PARTITION_INVALID");
  if (state.draftActiveOwners !== 0) errors.push("DRAFT_SOURCE_ACTIVE");
  if (state.textCarrierOwnsKgStatus) errors.push("TEXT_CARRIER_OWNS_KG_STATUS");
  if (state.foreignPromotedToKgMandatory !== 0) errors.push("FOREIGN_SOURCE_PROMOTED_TO_KG_MANDATORY");
  if (state.rowTraceMissing !== 0) errors.push("ROW_TRACE_OR_LOCATOR_MISSING");
  if (state.dispositionMissing !== 0) errors.push("ORIGINAL_ROW_DISPOSITION_MISSING");
  if (state.jurisdictionCellMissing !== 0) errors.push("JURISDICTION_CELL_MISSING");
  if (state.roadProofRebound !== 0) errors.push("ROAD_PROOF_REBOUND_TO_0701");
  if (state.durableProjectionLoss !== 0) errors.push("DURABLE_PROJECTION_ROW_LOSS");
  if (state.successorSelectedGroups !== 0) errors.push("SUCCESSOR_SELECTED_GROUPS");
  if (state.trackedSelfReferenceRequired) errors.push("TRACKED_SELF_REFERENTIAL_SHA");
  if (!state.finalWorktreeClean || state.mixedShaEvidence !== 0) errors.push("DIRTY_OR_MIXED_SHA_FINAL_STATE");
  return errors;
}

export const CONTROLLED_MUTATIONS: ReadonlyArray<{ id: string; expectedCode: string; mutate: (state: R2ValidationState) => void }> = [
  { id: "red_predecessor", expectedCode: "RED_PREDECESSOR_ACCEPTED", mutate: (s) => { s.predecessorVerdict = "RED"; } },
  { id: "two_green_roots", expectedCode: "GREEN_ROOT_AMBIGUITY", mutate: (s) => { s.greenRootCount = 2; } },
  { id: "token_head_mismatch", expectedCode: "TOKEN_HEAD_MISMATCH", mutate: (s) => { s.tokenHeadMatches = false; } },
  { id: "manifest_byte_mismatch", expectedCode: "MANIFEST_BYTE_MISMATCH", mutate: (s) => { s.manifestMatches = false; } },
  { id: "wrong_contract_exclusion", expectedCode: "CONTRACT_CANONICAL_EXCLUSION_INVALID", mutate: (s) => { s.contractExcludedLineCount = 0; } },
  { id: "activation_or_successor_placeholder", expectedCode: "PLACEHOLDER_PRESENT", mutate: (s) => { s.placeholders = 1; } },
  { id: "auditor_writes_target", expectedCode: "AUDITOR_TARGET_MUTATION", mutate: (s) => { s.auditorTargetWrites = 1; } },
  { id: "repairer_edits_verdict", expectedCode: "REPAIRER_AUDIT_VERDICT_MUTATION", mutate: (s) => { s.repairerVerdictWrites = 1; } },
  { id: "repair_touches_non_asphalt", expectedCode: "NON_ASPHALT_CONTENT_MUTATION", mutate: (s) => { s.nonAsphaltContentChanges = 1; } },
  { id: "external_counted_global", expectedCode: "R63_GLOBAL_EXTERNAL_PARTITION_INVALID", mutate: (s) => { s.externalInGlobal = 1; } },
  { id: "stale_4068_7542", expectedCode: "STALE_4068_7542_ARITHMETIC", mutate: (s) => { s.cumulativeCount = 4068; s.remainingCount = 7542; } },
  { id: "missing_global_member", expectedCode: "GLOBAL_MEMBER_PARTITION_INVALID", mutate: (s) => { s.globalUnion = 11609; s.globalUnassigned = 1; } },
  { id: "duplicate_m5_m6_member", expectedCode: "GLOBAL_MEMBER_PARTITION_INVALID", mutate: (s) => { s.globalIntersection = 1; } },
  { id: "draft_source_active", expectedCode: "DRAFT_SOURCE_ACTIVE", mutate: (s) => { s.draftActiveOwners = 1; } },
  { id: "text_carrier_owns_status", expectedCode: "TEXT_CARRIER_OWNS_KG_STATUS", mutate: (s) => { s.textCarrierOwnsKgStatus = true; } },
  { id: "foreign_source_kg_mandatory", expectedCode: "FOREIGN_SOURCE_PROMOTED_TO_KG_MANDATORY", mutate: (s) => { s.foreignPromotedToKgMandatory = 1; } },
  { id: "row_trace_locator_missing", expectedCode: "ROW_TRACE_OR_LOCATOR_MISSING", mutate: (s) => { s.rowTraceMissing = 1; } },
  { id: "disposition_missing", expectedCode: "ORIGINAL_ROW_DISPOSITION_MISSING", mutate: (s) => { s.dispositionMissing = 1; } },
  { id: "jurisdiction_cell_missing", expectedCode: "JURISDICTION_CELL_MISSING", mutate: (s) => { s.jurisdictionCellMissing = 1; } },
  { id: "road_rebound_0701", expectedCode: "ROAD_PROOF_REBOUND_TO_0701", mutate: (s) => { s.roadProofRebound = 1; } },
  { id: "durable_projection_loss", expectedCode: "DURABLE_PROJECTION_ROW_LOSS", mutate: (s) => { s.durableProjectionLoss = 1; } },
  { id: "successor_selects_group", expectedCode: "SUCCESSOR_SELECTED_GROUPS", mutate: (s) => { s.successorSelectedGroups = 2; } },
  { id: "tracked_self_reference", expectedCode: "TRACKED_SELF_REFERENTIAL_SHA", mutate: (s) => { s.trackedSelfReferenceRequired = true; } },
  { id: "dirty_or_mixed_sha", expectedCode: "DIRTY_OR_MIXED_SHA_FINAL_STATE", mutate: (s) => { s.finalWorktreeClean = false; s.mixedShaEvidence = 1; } },
];

export function runControlledMutations(): JsonRecord[] {
  return CONTROLLED_MUTATIONS.map(({ id, expectedCode, mutate }) => {
    const state = structuredClone(GREEN_R2_STATE) as R2ValidationState;
    mutate(state);
    const detectedCodes = validateR2State(state);
    return { id, expectedCode, detectedCodes, detected: detectedCodes.includes(expectedCode) };
  });
}
