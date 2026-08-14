/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  evaluateFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph.ts";
import { renderPdfBytes } from "../_shared/canonicalPdf.ts";

const WORKER_VERSION = "canonical-estimate-compiler.r2";
const MAX_JOBS_PER_INVOCATION = 4;
const MAX_RESOURCE_ROWS = 2_000;

type AdminClient = ReturnType<typeof createClient>;

type ClaimedJob = {
  id: string;
  operation: "compile" | "recalculate" | "pdf" | "procurement" | "legacy_revision_migration";
  catalog_id: string;
  parent_revision_id: string | null;
  target_release_id: string;
  owner_user_id: string;
  input_payload: {
    parameters?: Record<string, string | number | boolean>;
    currencyCode?: string;
    priceSnapshotIds?: string[];
    rowOverrides?: Record<string, Record<string, unknown>>;
    customRows?: Array<Record<string, unknown>>;
  };
  attempt: number;
};

type ResourceSpec = {
  id: string;
  row_id: string;
  ordinal: number;
  section: string;
  category: string;
  title_ru: string;
  unit_id: string;
  formula_id: string;
  inclusion_ast: Record<string, unknown>;
  resource_graph: Record<string, unknown>;
  procurement_eligible: boolean;
  cost_owner_id: string | null;
  source_metadata: Record<string, unknown>;
  row_sha256: string;
};

function nonNegativeNumericText(value: unknown, field: string, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^\+?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return normalized;
}

function manualProvenance(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || (value as Record<string, unknown>).kind !== "manual") {
    throw Object.assign(new Error(`invalid ${field} provenance`), { code: "ROW_AMENDMENT_INVALID" });
  }
  const reason = (value as Record<string, unknown>).reason;
  if (reason != null && (typeof reason !== "string" || reason.trim().length > 500)) {
    throw Object.assign(new Error(`invalid ${field} reason`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return { kind: "manual", ...(reason == null ? {} : { reason: reason.trim() }) };
}

function boundedText(value: unknown, field: string, maxLength: number): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return normalized;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: string[], field: string): void {
  const accepted = new Set(allowed);
  if (Object.keys(value).some((key) => !accepted.has(key))) {
    throw Object.assign(new Error(`unsupported ${field} field`), { code: "ROW_AMENDMENT_INVALID" });
  }
}

function roundDecimal(value: string, scale: number): string {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw Object.assign(new Error("invalid decimal result"), { code: "DECIMAL_PROJECTION_INVALID" });
  const sign = match[1] === "-" ? -1n : 1n;
  const fraction = (match[3] ?? "").padEnd(scale + 1, "0");
  const factor = 10n ** BigInt(scale);
  let scaled = BigInt(match[2]) * factor + BigInt(fraction.slice(0, scale) || "0");
  if (Number(fraction[scale] ?? "0") >= 5) scaled += 1n;
  scaled *= sign;
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const integer = absolute / factor;
  const decimals = String(absolute % factor).padStart(scale, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${decimals ? `.${decimals}` : ""}`;
}

function multiply(quantity: string, unitPrice: string | null): string | null {
  if (unitPrice == null) return null;
  return roundDecimal(evaluateFormulaGraph({
      kind: "binary",
      operator: "*",
      left: { kind: "literal", value: quantity },
      right: { kind: "literal", value: unitPrice },
    }, {}), 2);
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function secretMatches(request: Request): Promise<boolean> {
  const expected = String(Deno.env.get("ESTIMATE_WORKER_SECRET") ?? "");
  const actual = String(request.headers.get("x-estimate-worker-secret") ?? "");
  if (expected.length < 32 || expected.length !== actual.length) return false;
  const encoder = new TextEncoder();
  const [expectedHash, actualHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(actualHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function evaluateCondition(ast: Record<string, unknown>, parameters: Record<string, unknown>): boolean {
  const kind = String(ast?.kind ?? "");
  if (kind === "literal") return ast.value === true;
  if (kind === "parameter") return parameters[String(ast.id ?? "")] === true;
  if (kind === "not") return !evaluateCondition(ast.operand as Record<string, unknown>, parameters);
  if (kind === "and" || kind === "or") {
    const operands = Array.isArray(ast.operands) ? ast.operands : [];
    return kind === "and"
      ? operands.every((entry) => evaluateCondition(entry as Record<string, unknown>, parameters))
      : operands.some((entry) => evaluateCondition(entry as Record<string, unknown>, parameters));
  }
  if (kind === "equals") {
    return parameters[String(ast.parameterId ?? "")] === ast.value;
  }
  throw Object.assign(new Error("unsupported inclusion AST"), { code: "INVALID_INCLUSION_GRAPH" });
}

function validateParameters(definitions: Array<Record<string, unknown>>, values: Record<string, unknown>) {
  const accepted = new Set(definitions.map((definition) => String(definition.parameter_id)));
  const unknown = Object.keys(values).filter((key) => !accepted.has(key));
  if (unknown.length > 0) throw Object.assign(new Error("unknown estimate parameters"), { code: "PARAMETER_VALIDATION_FAILED" });

  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const constraints = (definition.constraints_json ?? {}) as Record<string, unknown>;
    const value = values[id] ?? definition.default_value;
    if (value == null) {
      if (definition.required) throw Object.assign(new Error(`missing parameter ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
      continue;
    }
    const type = String(definition.value_type);
    if (type === "boolean" && typeof value !== "boolean") throw Object.assign(new Error(`invalid boolean ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    if ((type === "decimal" || type === "integer") && !/^[+-]?\d+(?:\.\d+)?$/.test(String(value))) {
      throw Object.assign(new Error(`invalid number ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if (type === "integer" && !Number.isInteger(Number(value))) throw Object.assign(new Error(`invalid integer ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    if (type === "enum" && Array.isArray(constraints.values) && !constraints.values.includes(value)) {
      throw Object.assign(new Error(`invalid enum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if ((type === "decimal" || type === "integer") && constraints.min != null && Number(value) < Number(constraints.min)) {
      throw Object.assign(new Error(`parameter below minimum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if ((type === "decimal" || type === "integer") && constraints.max != null && Number(value) > Number(constraints.max)) {
      throw Object.assign(new Error(`parameter above maximum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    values[id] = value;
  }
}

async function loadPriceItems(admin: AdminClient, snapshotIds: string[]) {
  const prices = new Map<string, Record<string, unknown>>();
  if (snapshotIds.length === 0) return prices;
  const { data, error } = await admin
    .from("estimate_price_snapshot_item")
    .select("snapshot_id,price_key,unit_id,unit_price,currency_code,estimate_price_snapshot!inner(route_id,captured_at)")
    .in("snapshot_id", snapshotIds)
    .order("captured_at", { foreignTable: "estimate_price_snapshot", ascending: false })
    .limit(20_000);
  if (error) throw Object.assign(new Error("price snapshot load failed"), { code: "PRICE_LOAD_FAILED" });
  for (const item of data ?? []) {
    const key = `${item.price_key}:${item.unit_id}`;
    if (!prices.has(key)) prices.set(key, item);
  }
  return prices;
}

async function compileJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  const { data: release, error: releaseError } = await admin
    .from("estimate_definition_release")
    .select("id,status")
    .eq("id", job.target_release_id)
    .single();
  if (releaseError || (release.status !== "active" && !(release.status === "prepared" && job.input_payload?.releaseAdmission === true))) {
    throw Object.assign(new Error("target release load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }

  const { data: definition, error: definitionError } = await admin
    .from("estimate_definition_version")
    .select("id")
    .eq("release_id", release.id)
    .eq("catalog_id", job.catalog_id)
    .single();
  if (definitionError) throw Object.assign(new Error("definition load failed"), { code: "DEFINITION_LOAD_FAILED" });

  const [parameterResult, formulaResult, resourceResult] = await Promise.all([
    admin.from("estimate_parameter_definition").select("parameter_id,value_type,required,default_value,constraints_json").eq("definition_version_id", definition.id).order("ordinal"),
    admin.from("estimate_formula_graph").select("formula_id,ast,input_parameter_ids,ast_sha256").eq("definition_version_id", definition.id),
    admin.from("estimate_resource_spec").select("id,row_id,ordinal,section,category,title_ru,unit_id,formula_id,inclusion_ast,resource_graph,procurement_eligible,cost_owner_id,source_metadata,row_sha256").eq("definition_version_id", definition.id).order("ordinal").limit(MAX_RESOURCE_ROWS + 1),
  ]);
  if (parameterResult.error || formulaResult.error || resourceResult.error) {
    throw Object.assign(new Error("definition graph load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  if ((resourceResult.data?.length ?? 0) > MAX_RESOURCE_ROWS) {
    throw Object.assign(new Error("resource graph row limit exceeded"), { code: "DEFINITION_LIMIT_EXCEEDED" });
  }

  const parameters = { ...(job.input_payload?.parameters ?? {}) } as Record<string, unknown>;
  validateParameters(parameterResult.data ?? [], parameters);
  const numericParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => typeof value === "number" || typeof value === "string"),
  ) as Record<string, string | number>;
  const formulas = new Map((formulaResult.data ?? []).map((formula) => [formula.formula_id, formula]));
  const snapshotIds = Array.isArray(job.input_payload?.priceSnapshotIds) ? job.input_payload.priceSnapshotIds : [];
  const prices = await loadPriceItems(admin, snapshotIds);
  const currencyCode = String(job.input_payload?.currencyCode ?? "");
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw Object.assign(new Error("invalid currency"), { code: "PARAMETER_VALIDATION_FAILED" });

  const rawOverrides = job.input_payload?.rowOverrides ?? {};
  const rawCustomRows = job.input_payload?.customRows ?? [];
  if (!rawOverrides || typeof rawOverrides !== "object" || Array.isArray(rawOverrides)
    || Object.keys(rawOverrides).length > MAX_RESOURCE_ROWS
    || !Array.isArray(rawCustomRows) || rawCustomRows.length > 200) {
    throw Object.assign(new Error("row amendment payload exceeds limits"), { code: "ROW_AMENDMENT_INVALID" });
  }
  if (job.operation !== "recalculate"
    && (Object.keys(rawOverrides).length > 0 || rawCustomRows.length > 0)) {
    throw Object.assign(new Error("row amendments require recalculate"), { code: "ROW_AMENDMENT_INVALID" });
  }
  const overrides = new Map(Object.entries(rawOverrides));
  const rows: Array<Record<string, unknown>> = [];
  const rowIds = new Set<string>();
  let totalAmount = "0";
  const addToTotal = (amount: string | null, included: boolean) => {
    if (amount != null && included) {
      totalAmount = evaluateFormulaGraph({
        kind: "binary",
        operator: "+",
        left: { kind: "literal", value: totalAmount },
        right: { kind: "literal", value: amount },
      }, {});
    }
  };
  for (const resource of (resourceResult.data ?? []) as ResourceSpec[]) {
    if (!evaluateCondition(resource.inclusion_ast, parameters)) continue;
    const formula = formulas.get(resource.formula_id);
    if (!formula) throw Object.assign(new Error("formula graph reference missing"), { code: "DEFINITION_INTEGRITY_FAILED" });
    const calculatedQuantity = evaluateFormulaGraph(formula.ast as FormulaAst, numericParameters);
    const priceKey = resource.cost_owner_id || resource.row_id;
    const price = prices.get(`${priceKey}:${resource.unit_id}`);
    if (price && price.currency_code !== currencyCode) {
      throw Object.assign(new Error("mixed currency snapshot"), { code: "PRICE_CURRENCY_MISMATCH" });
    }
    const override = overrides.get(resource.row_id);
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw Object.assign(new Error(`invalid row override ${resource.row_id}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    if (override != null) assertOnlyKeys(override, [
      "titleRu", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance",
    ], `row override ${resource.row_id}`);
    const provenance = override == null ? null : manualProvenance(override.provenance, resource.row_id);
    const quantity = override?.quantity == null
      ? calculatedQuantity
      : nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)!;
    const snapshotUnitPrice = price ? String(price.unit_price) : null;
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
      : snapshotUnitPrice;
    const includedInEstimate = override?.includedInEstimate == null ? true : override.includedInEstimate;
    const includedInProcurement = includedInEstimate
      && (override?.includedInProcurement == null ? resource.procurement_eligible : override.includedInProcurement);
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !resource.procurement_eligible)) {
      throw Object.assign(new Error(`invalid row inclusion ${resource.row_id}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const calculationTrace = {
      compilerVersion: WORKER_VERSION,
      formulaId: resource.formula_id,
      formulaAstSha256: formula.ast_sha256,
      inputParameterIds: formula.input_parameter_ids,
      resourceGraph: resource.resource_graph,
      ...(provenance == null ? {} : { manualAmendment: provenance }),
    };
    const normativeTrace = Array.isArray(resource.source_metadata?.normativeTrace)
      ? resource.source_metadata.normativeTrace
      : [];
    const rowBase = {
      rowId: resource.row_id,
      ordinal: resource.ordinal,
      resourceSpecId: resource.id,
      section: resource.section,
      category: resource.category,
      titleRu: override?.titleRu == null
        ? resource.title_ru
        : boundedText(override.titleRu, `${resource.row_id}.titleRu`, 2_000),
      unitId: resource.unit_id,
      quantity,
      unitPrice,
      amount,
      currencyCode: unitPrice == null ? null : currencyCode,
      procurementEligible: resource.procurement_eligible,
      includedInEstimate,
      includedInProcurement,
      ownershipStatus: includedInEstimate ? "OWNED" : "OWNED_EXCLUDED",
      calculationTrace,
      normativeTrace,
      sourceRowSha256: resource.row_sha256,
      priceSnapshotId: provenance != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? null
        : price?.snapshot_id ?? null,
      priceRouteId: provenance != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? null
        : price?.estimate_price_snapshot?.route_id ?? null,
      priceResolutionTrace: provenance != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? { kind: "manual_override", provenance, resolved: unitPrice != null }
        : price ? { priceKey, resolved: true } : { priceKey, resolved: false },
    };
    const row = {
      row_id: rowBase.rowId,
      ordinal: rowBase.ordinal,
      resource_spec_id: rowBase.resourceSpecId,
      section: rowBase.section,
      category: rowBase.category,
      title_ru: rowBase.titleRu,
      unit_id: rowBase.unitId,
      quantity: rowBase.quantity,
      unit_price: rowBase.unitPrice,
      amount: rowBase.amount,
      currency_code: rowBase.currencyCode,
      procurement_eligible: rowBase.procurementEligible,
      included_in_estimate: rowBase.includedInEstimate,
      included_in_procurement: rowBase.includedInProcurement,
      ownership_status: rowBase.ownershipStatus,
      calculation_trace: rowBase.calculationTrace,
      normative_trace: rowBase.normativeTrace,
      legacy_row_payload: null,
      price_snapshot_id: rowBase.priceSnapshotId,
      price_route_id: rowBase.priceRouteId,
      price_resolution_trace: rowBase.priceResolutionTrace,
    } as Record<string, unknown>;
    row.row_sha256 = await sha256(row);
    rows.push(row);
    rowIds.add(resource.row_id);
    overrides.delete(resource.row_id);
  }

  if (overrides.size > 0) {
    throw Object.assign(new Error(`row override is not reachable: ${[...overrides.keys()][0]}`), {
      code: "ROW_OVERRIDE_NOT_REACHED",
    });
  }
  let nextOrdinal = rows.reduce((maximum, row) => Math.max(maximum, Number(row.ordinal)), -1) + 1;
  for (let index = 0; index < rawCustomRows.length; index += 1) {
    const custom = rawCustomRows[index];
    if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
      throw Object.assign(new Error(`invalid custom row ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    assertOnlyKeys(custom, [
      "clientRowId", "section", "category", "titleRu", "unitId", "quantity", "unitPrice",
      "includedInEstimate", "includedInProcurement", "provenance",
    ], `custom row ${index}`);
    const clientRowId = boundedText(custom.clientRowId, `customRows.${index}.clientRowId`, 200);
    if (!/^[A-Za-z0-9._:-]+$/.test(clientRowId)) {
      throw Object.assign(new Error(`invalid custom row identity ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    const rowId = `manual:${clientRowId}`;
    if (rowIds.has(rowId)) throw Object.assign(new Error(`duplicate custom row ${rowId}`), { code: "ROW_AMENDMENT_INVALID" });
    const provenance = manualProvenance(custom.provenance, `customRows.${index}`);
    const quantity = nonNegativeNumericText(custom.quantity, `customRows.${index}.quantity`)!;
    const unitPrice = nonNegativeNumericText(custom.unitPrice, `customRows.${index}.unitPrice`, true);
    const includedInEstimate = custom.includedInEstimate;
    const includedInProcurement = custom.includedInProcurement;
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !includedInEstimate)) {
      throw Object.assign(new Error(`invalid custom row inclusion ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const sourcePayload = { kind: "manual_server_owned_v1", clientRowId, provenance };
    const row = {
      row_id: rowId,
      ordinal: nextOrdinal,
      resource_spec_id: null,
      section: boundedText(custom.section, `customRows.${index}.section`, 240),
      category: boundedText(custom.category, `customRows.${index}.category`, 240),
      title_ru: boundedText(custom.titleRu, `customRows.${index}.titleRu`, 2_000),
      unit_id: boundedText(custom.unitId, `customRows.${index}.unitId`, 120),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null ? null : currencyCode,
      procurement_eligible: true,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInProcurement,
      ownership_status: "MANUAL_SERVER_OWNED",
      calculation_trace: { compilerVersion: WORKER_VERSION, manualAmendment: provenance },
      normative_trace: [],
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: { kind: "manual_custom_row", provenance, resolved: unitPrice != null },
    } as Record<string, unknown>;
    row.row_sha256 = await sha256(row);
    rows.push(row);
    rowIds.add(rowId);
    nextOrdinal += 1;
  }

  const totals = {
    amount: totalAmount,
    includedRowCount: rows.filter((row) => row.included_in_estimate).length,
    excludedRowCount: rows.filter((row) => !row.included_in_estimate).length,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode,
  };
  const revisionProjection = {
    catalogId: job.catalog_id,
    parameters,
    priceSnapshotIds: snapshotIds,
    currencyCode,
    totals,
    rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
    compilerVersion: WORKER_VERSION,
  };
  const { data: revisionId, error: commitError } = await admin.rpc("estimate_commit_compile_job_v1", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_revision: {
      rowCount: rows.length,
      currencyCode,
      totals,
      checksumSha256: await sha256(revisionProjection),
      compilerVersion: WORKER_VERSION,
      migrationSource: null,
    },
    p_rows: rows,
  });
  if (commitError) {
    const conflict = /optimistic revision conflict/i.test(String(commitError.message ?? ""));
    const transient = !conflict && ["40001", "40P01"].includes(String(commitError.code ?? ""));
    throw Object.assign(new Error("atomic revision commit failed"), {
      code: conflict ? "REVISION_CONFLICT" : transient ? "REVISION_COMMIT_RETRYABLE" : "REVISION_COMMIT_FAILED",
    });
  }
  return revisionId;
}

function requiredText(value: unknown, field: string, maxLength = 240): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "LEGACY_REVISION_INVALID" });
  }
  return normalized;
}

function numericText(value: unknown, field: string, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "LEGACY_REVISION_INVALID" });
  }
  return normalized;
}

async function compileLegacyRevisionJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  const payload = job.input_payload as Record<string, unknown>;
  const sourceEstimateId = requiredText(payload.sourceEstimateId, "sourceEstimateId");
  const sourceRevisionId = requiredText(payload.sourceRevisionId, "sourceRevisionId");
  const currencyCode = requiredText(payload.currencyCode, "currencyCode", 3);
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw Object.assign(new Error("invalid currency"), { code: "LEGACY_REVISION_INVALID" });
  const sourceRows = Array.isArray(payload.rows) ? payload.rows : null;
  if (!sourceRows || sourceRows.length > 5_000) {
    throw Object.assign(new Error("invalid legacy rows"), { code: "LEGACY_REVISION_INVALID" });
  }
  const sourceProjection = {
    sourceEstimateId,
    sourceRevisionId,
    catalogId: job.catalog_id,
    currencyCode,
    parameters: payload.parameters ?? {},
    totals: payload.totals ?? {},
    rows: sourceRows,
  };
  const sourceChecksumSha256 = await sha256(sourceProjection);
  if (sourceChecksumSha256 !== payload.sourceChecksumSha256) {
    throw Object.assign(new Error("legacy source checksum mismatch"), { code: "LEGACY_CHECKSUM_MISMATCH" });
  }

  const { data: release, error: releaseError } = await admin
    .from("estimate_definition_release").select("id,status").eq("id", job.target_release_id).single();
  if (releaseError || release.status !== "active") throw Object.assign(new Error("target release load failed"), { code: "DEFINITION_LOAD_FAILED" });
  const { data: definition, error: definitionError } = await admin
    .from("estimate_definition_version").select("id").eq("release_id", release.id).eq("catalog_id", job.catalog_id).single();
  if (definitionError) throw Object.assign(new Error("definition load failed"), { code: "DEFINITION_LOAD_FAILED" });
  const { data: specs, error: specsError } = await admin
    .from("estimate_resource_spec").select("id,row_id").eq("definition_version_id", definition.id).limit(MAX_RESOURCE_ROWS + 1);
  if (specsError || (specs?.length ?? 0) > MAX_RESOURCE_ROWS) {
    throw Object.assign(new Error("resource map load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  const specByRowId = new Map((specs ?? []).map((entry) => [String(entry.row_id), entry.id]));
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  let totalAmount = "0";
  let matchedRows = 0;
  let unmatchedRows = 0;
  for (let ordinal = 0; ordinal < sourceRows.length; ordinal += 1) {
    const source = sourceRows[ordinal] as Record<string, unknown>;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw Object.assign(new Error("legacy row must be an object"), { code: "LEGACY_REVISION_INVALID" });
    }
    const rowId = requiredText(source.rowId, `rows[${ordinal}].rowId`);
    if (seen.has(rowId)) throw Object.assign(new Error("duplicate legacy row id"), { code: "LEGACY_REVISION_INVALID" });
    seen.add(rowId);
    const sourceQuantity = numericText(source.quantity, `rows[${ordinal}].quantity`, true);
    const sourceUnitPrice = numericText(source.unitPrice, `rows[${ordinal}].unitPrice`, true);
    const sourceAmount = numericText(source.amount, `rows[${ordinal}].amount`, true);
    const quantity = sourceQuantity == null ? null : roundDecimal(sourceQuantity, 9);
    const unitPrice = sourceUnitPrice == null ? null : roundDecimal(sourceUnitPrice, 6);
    const amount = sourceAmount == null ? null : roundDecimal(sourceAmount, 2);
    const sourcePayload = source.sourcePayload && typeof source.sourcePayload === "object" && !Array.isArray(source.sourcePayload)
      ? source.sourcePayload as Record<string, unknown>
      : source;
    const calculationTrace = source.calculationTrace && typeof source.calculationTrace === "object" && !Array.isArray(source.calculationTrace)
      ? source.calculationTrace as Record<string, unknown>
      : {};
    const normativeTrace = Array.isArray(source.normativeTrace) ? source.normativeTrace : [];
    const resourceSpecId = specByRowId.get(rowId) ?? null;
    const includedInEstimate = resourceSpecId != null;
    const procurementEligible = source.procurementEligible === true;
    if (includedInEstimate) {
      matchedRows += 1;
      if (amount != null) {
        totalAmount = evaluateFormulaGraph({
          kind: "binary",
          operator: "+",
          left: { kind: "literal", value: totalAmount },
          right: { kind: "literal", value: amount },
        }, {});
      }
    } else {
      unmatchedRows += 1;
    }
    const row = {
      row_id: rowId,
      ordinal,
      resource_spec_id: resourceSpecId,
      section: requiredText(source.section ?? "legacy", `rows[${ordinal}].section`),
      category: requiredText(source.category ?? "legacy", `rows[${ordinal}].category`),
      title_ru: requiredText(source.titleRu, `rows[${ordinal}].titleRu`, 2_000),
      unit_id: requiredText(source.unitId ?? "unit", `rows[${ordinal}].unitId`),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null && amount == null ? null : currencyCode,
      procurement_eligible: procurementEligible,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInEstimate && procurementEligible,
      ownership_status: includedInEstimate ? "OWNED" : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      calculation_trace: {
        ...calculationTrace,
        migration: { sourceEstimateId, sourceRevisionId, sourceOrdinal: ordinal },
      },
      normative_trace: normativeTrace,
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: {
        migrated: true,
        sourcePricePreserved: sourceUnitPrice != null,
        ownershipDisposition: includedInEstimate
          ? "OWNED"
          : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    } as Record<string, unknown>;
    row.row_sha256 = await sha256(row);
    rows.push(row);
  }

  const sourceTotals = payload.totals && typeof payload.totals === "object" ? payload.totals : {};
  const totals = {
    ...(sourceTotals as Record<string, unknown>),
    amount: totalAmount,
    includedRowCount: matchedRows,
    excludedRowCount: unmatchedRows,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode,
  };
  const revisionProjection = {
    sourceChecksumSha256,
    catalogId: job.catalog_id,
    totals,
    rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
    compilerVersion: WORKER_VERSION,
  };

  const { data: revisionId, error: commitError } = await admin.rpc("estimate_commit_compile_job_v1", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_revision: {
      rowCount: rows.length,
      currencyCode,
      totals,
      checksumSha256: await sha256(revisionProjection),
      compilerVersion: WORKER_VERSION,
      migrationSource: {
        kind: "legacy_revision_post_line_v2",
        sourceEstimateId,
        sourceRevisionId,
        sourceChecksumSha256,
        sourceTotals,
        rowsPreserved: rows.length,
        matchedRows,
        unmatchedRows,
        unmatchedDisposition: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    },
    p_rows: rows,
  });
  if (commitError) throw Object.assign(new Error("atomic legacy revision commit failed"), { code: "REVISION_COMMIT_FAILED" });
  return revisionId;
}

async function buildArtifactJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  if (!job.parent_revision_id || (job.operation !== "pdf" && job.operation !== "procurement")) {
    throw Object.assign(new Error("invalid artifact job"), { code: "ARTIFACT_JOB_INVALID" });
  }
  const [{ data: revision, error: revisionError }, { data: rowData, error: rowsError }] = await Promise.all([
    admin.from("estimate_revision")
      .select("id,release_id,catalog_id,revision_number,input_parameters,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,migration_source,created_at")
      .eq("id", job.parent_revision_id).single(),
    admin.from("estimate_revision_row")
      .select("row_id,ordinal,section,category,title_ru,unit_id,quantity,unit_price,amount,currency_code,procurement_eligible,included_in_estimate,included_in_procurement,ownership_status,calculation_trace,normative_trace,legacy_row_payload,row_sha256")
      .eq("revision_id", job.parent_revision_id).order("ordinal").limit(5_001),
  ]);
  if (revisionError || rowsError || !revision || (rowData?.length ?? 0) > 5_000
    || rowData?.length !== revision.row_count) {
    throw Object.assign(new Error("artifact source revision load failed"), { code: "ARTIFACT_SOURCE_INVALID" });
  }
  const rows = rowData ?? [];
  const selectedProcurementRows = rows.filter((row) => row.procurement_eligible && row.included_in_procurement);
  let bytes: Uint8Array;
  let contentType: string;
  let extension: string;
  let renderer: string;
  if (job.operation === "procurement") {
    const groups = new Map<string, { section: string; category: string; rowIds: string[] }>();
    for (const row of selectedProcurementRows) {
      const key = `${row.section}\u0000${row.category}`;
      const group = groups.get(key) ?? { section: row.section, category: row.category, rowIds: [] };
      group.rowIds.push(row.row_id);
      groups.set(key, group);
    }
    const projection = {
      schemaVersion: "canonical_estimate_procurement_v2",
      revisionId: revision.id,
      releaseId: revision.release_id,
      revisionChecksumSha256: revision.checksum_sha256,
      catalogId: revision.catalog_id,
      currencyCode: revision.currency_code,
      revisionTotals: revision.totals,
      parameters: revision.input_parameters,
      amendmentContract: revision.amendment_contract,
      selectedRowCount: selectedProcurementRows.length,
      groups: [...groups.values()],
      rows: rows.map((row) => ({
        rowId: row.row_id,
        ordinal: row.ordinal,
        section: row.section,
        category: row.category,
        titleRu: row.title_ru,
        unitId: row.unit_id,
        quantity: row.quantity == null ? null : String(row.quantity),
        unitPrice: row.unit_price == null ? null : String(row.unit_price),
        amount: row.amount == null ? null : String(row.amount),
        procurementEligible: row.procurement_eligible,
        includedInEstimate: row.included_in_estimate,
        includedInProcurement: row.included_in_procurement,
        rowSha256: row.row_sha256,
        ownershipStatus: row.ownership_status,
        manualAmendment: row.calculation_trace?.manualAmendment ?? null,
        normativeTrace: row.normative_trace,
        legacyDisposition: row.legacy_row_payload == null ? null : row.ownership_status,
      })),
    };
    bytes = new TextEncoder().encode(stableJson(projection));
    contentType = "application/json; charset=utf-8";
    extension = "json";
    renderer = "canonical-procurement-projection.r2";
  } else {
    const tableRows = rows.map((row) => {
      const normative = Array.isArray(row.normative_trace)
        ? row.normative_trace.map((entry) => {
          if (entry && typeof entry === "object") {
            const record = entry as Record<string, unknown>;
            return [record.sourceId, record.locator, record.postRowLocator].filter(Boolean).join(" · ");
          }
          return String(entry ?? "");
        }).filter(Boolean).join("; ")
        : "";
      const manual = row.calculation_trace?.manualAmendment == null
        ? ""
        : `manual: ${stableJson(row.calculation_trace.manualAmendment)}`;
      const disposition = [row.ownership_status, row.included_in_estimate ? "в смете" : "исключена",
        row.included_in_procurement ? "в закупке" : "не в закупке", manual].filter(Boolean).join(" · ");
      return `<tr><td>${row.ordinal + 1}</td><td>${escapeHtml(row.section)}<br><span class="muted">${escapeHtml(row.category)}</span></td><td>${escapeHtml(row.title_ru)}<br><span class="muted">${escapeHtml(disposition)}</span></td><td>${escapeHtml(row.unit_id)}</td><td>${escapeHtml(row.quantity ?? "—")}</td><td>${escapeHtml(row.unit_price ?? "—")}</td><td>${escapeHtml(row.amount ?? "—")}</td><td>${escapeHtml(normative || "—")}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#111827}h1{font-size:20px;margin:0 0 8px}h2{font-size:14px;margin:12px 0 5px}.meta,.muted{font-size:9px;color:#4b5563;word-break:break-word}.identity{font-size:10px;word-break:break-all}pre{white-space:pre-wrap;word-break:break-word;border:1px solid #e5e7eb;background:#f9fafb;padding:6px;font-size:9px}table{width:100%;border-collapse:collapse;font-size:8px}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #d1d5db;padding:4px;text-align:left;vertical-align:top}th{background:#f3f4f6}</style></head><body><h1>Каноническая смета</h1><div class="identity">revision_id: ${escapeHtml(revision.id)}<br>release_id: ${escapeHtml(revision.release_id)}<br>catalog_id: ${escapeHtml(revision.catalog_id)}<br>checksum: ${escapeHtml(revision.checksum_sha256)}<br>compiler: ${escapeHtml(revision.compiler_version)}</div><h2>Параметры</h2><pre>${escapeHtml(stableJson(revision.input_parameters))}</pre><h2>Итоги</h2><pre>${escapeHtml(stableJson(revision.totals))}</pre><h2>Позиции и нормативные ссылки</h2><table><thead><tr><th>№</th><th>Раздел / категория</th><th>Позиция / disposition</th><th>Ед.</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Норматив</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const rendered = await renderPdfBytes(html);
    bytes = rendered.pdfBytes;
    contentType = "application/pdf";
    extension = "pdf";
    renderer = rendered.renderer;
  }
  const artifactSha256 = await sha256Bytes(bytes);
  const bucketId = String(Deno.env.get("CANONICAL_ESTIMATE_ARTIFACT_BUCKET") ?? "estimate-artifacts").trim();
  const storageKey = `${job.owner_user_id}/${revision.id}/${job.operation}/${revision.checksum_sha256}.${extension}`;
  const { error: uploadError } = await admin.storage.from(bucketId).upload(storageKey, bytes, {
    contentType,
    upsert: true,
  });
  if (uploadError) throw Object.assign(new Error("artifact storage upload failed"), { code: "ARTIFACT_STORAGE_FAILED" });
  const { data: artifactId, error: commitError } = await admin.rpc("estimate_commit_artifact_job_v1", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_artifact: {
      kind: job.operation,
      storageBucket: bucketId,
      storageKey,
      contentType,
      byteSize: bytes.byteLength,
      sha256: artifactSha256,
      metadata: {
        renderer,
        sourceRevisionChecksumSha256: revision.checksum_sha256,
        sourceReleaseId: revision.release_id,
        projectedRowCount: rows.length,
        selectedProcurementRowCount: job.operation === "procurement" ? selectedProcurementRows.length : null,
        includesExcludedDisposition: true,
        includesParametersAndTotals: true,
      },
    },
  });
  if (commitError) throw Object.assign(new Error("artifact commit failed"), { code: "ARTIFACT_COMMIT_FAILED" });
  return artifactId;
}

async function failJob(admin: AdminClient, workerId: string, job: ClaimedJob, error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "COMPILER_FAILED";
  const retryDelay = Math.min(300, 2 ** Math.min(job.attempt, 8));
  const retryable = code.endsWith("_LOAD_FAILED")
    || code.endsWith("_STORAGE_FAILED")
    || code === "REVISION_COMMIT_RETRYABLE";
  const { error: failError } = await admin.rpc("estimate_fail_compile_job_v2", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_error_code: code.slice(0, 100),
    p_error_detail: { compilerVersion: WORKER_VERSION, retryable },
    p_retryable: retryable,
    p_retry_delay_seconds: retryDelay,
  });
  // Cancellation clears the lease. A late worker is intentionally unable to
  // resurrect or rewrite the cancelled job.
  if (failError && String(failError.code ?? "") !== "55000") {
    throw Object.assign(new Error("job failure transition failed"), { code: "JOB_FAILURE_TRANSITION_FAILED" });
  }
  return code;
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", requestId }), { status: 405 });
  if (!(await secretMatches(request))) return new Response(JSON.stringify({ error: "AUTH_REQUIRED", requestId }), { status: 401 });

  const url = String(Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: "BACKEND_CONFIGURATION_ERROR", requestId }), { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const workerId = `edge:${requestId}`;
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 1);
  const limit = Number.isInteger(requestedLimit) ? Math.min(MAX_JOBS_PER_INVOCATION, Math.max(1, requestedLimit)) : 1;
  const { data: jobs, error: claimError } = await admin.rpc("estimate_claim_compile_jobs_v1", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
  });
  if (claimError) return new Response(JSON.stringify({ error: "JOB_CLAIM_FAILED", requestId }), { status: 503 });

  const results = [];
  for (const job of (jobs ?? []) as ClaimedJob[]) {
    try {
      if (job.operation === "legacy_revision_migration") {
        results.push({ jobId: job.id, revisionId: await compileLegacyRevisionJob(admin, workerId, job), status: "succeeded" });
      } else if (job.operation === "pdf" || job.operation === "procurement") {
        results.push({ jobId: job.id, artifactId: await buildArtifactJob(admin, workerId, job), status: "succeeded" });
      } else {
        results.push({ jobId: job.id, revisionId: await compileJob(admin, workerId, job), status: "succeeded" });
      }
    } catch (error) {
      const code = await failJob(admin, workerId, job, error);
      console.error("[canonical-estimate-worker] compile failed", { requestId, jobId: job.id, code });
      results.push({ jobId: job.id, status: "retry_or_failed", code });
    }
  }
  return new Response(JSON.stringify({ requestId, workerVersion: WORKER_VERSION, claimed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
});
