import { listSuppliers as listSuppliersViaTransport } from "../../../lib/catalog/catalog.facade";
import type { Supplier } from "../../../lib/catalog/catalog.types";
import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";

export const COMPARE_SUPPLIERS_TOOL_NAME = "compare_suppliers" as const;
export const COMPARE_SUPPLIERS_MAX_LIMIT = 10;
export const COMPARE_SUPPLIERS_DEFAULT_LIMIT = 5;
export const COMPARE_SUPPLIERS_MAX_MATERIAL_IDS = 20;
export const COMPARE_SUPPLIERS_NEXT_ACTION = "draft_request" as const;

export type CompareSuppliersToolInput = {
  material_ids: string[];
  project_id?: string;
  location?: string;
  limit?: number;
};

export type CompareSuppliersRange = {
  status: "not_available_in_safe_read";
  summary: string;
};

export type CompareSupplierCard = {
  supplier_id: string;
  supplier_name: string;
  summary: string;
  risk_flags: string[];
  evidence_ref: string;
};

export type CompareSuppliersToolOutput = {
  supplier_cards: CompareSupplierCard[];
  price_range: CompareSuppliersRange;
  delivery_range: CompareSuppliersRange;
  risk_flags: string[];
  recommendation_summary: string;
  evidence_refs: string[];
  next_action: typeof COMPARE_SUPPLIERS_NEXT_ACTION;
  bounded: true;
  mutation_count: 0;
  no_supplier_confirmation: true;
  no_order_created: true;
  no_rfq_sent: true;
  warehouse_unchanged: true;
};

export type CompareSuppliersToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type CompareSuppliersReader = (
  query: string,
  limit: number,
) => Promise<readonly Supplier[]>;

export type CompareSuppliersToolRequest = {
  auth: CompareSuppliersToolAuthContext | null;
  input: unknown;
  listSuppliers?: CompareSuppliersReader;
};

export type CompareSuppliersToolErrorCode =
  | "COMPARE_SUPPLIERS_AUTH_REQUIRED"
  | "COMPARE_SUPPLIERS_ROLE_NOT_ALLOWED"
  | "COMPARE_SUPPLIERS_INVALID_INPUT"
  | "COMPARE_SUPPLIERS_READ_FAILED";

export type CompareSuppliersToolEnvelope =
  | {
      ok: true;
      data: CompareSuppliersToolOutput;
    }
  | {
      ok: false;
      error: {
        code: CompareSuppliersToolErrorCode;
        message: string;
      };
    };

type NormalizedCompareSuppliersInput = {
  material_ids: string[];
  project_id: string | null;
  location: string | null;
  limit: number;
};

type InputValidationResult =
  | { ok: true; value: NormalizedCompareSuppliersInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return COMPARE_SUPPLIERS_DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(COMPARE_SUPPLIERS_MAX_LIMIT, Math.floor(value)));
}

function normalizeMaterialIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of value) {
    const text = normalizeOptionalText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
    if (normalized.length >= COMPARE_SUPPLIERS_MAX_MATERIAL_IDS) break;
  }
  return normalized;
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "compare_suppliers input must be an object" };
  }

  const materialIds = normalizeMaterialIds(input.material_ids);
  if (materialIds.length === 0) {
    return { ok: false, message: "compare_suppliers material_ids are required" };
  }

  return {
    ok: true,
    value: {
      material_ids: materialIds,
      project_id: normalizeOptionalText(input.project_id),
      location: normalizeOptionalText(input.location),
      limit: normalizeLimit(input.limit),
    },
  };
}

function buildSupplierSearchQuery(input: NormalizedCompareSuppliersInput): string {
  return [input.material_ids.join(" "), input.location].filter(Boolean).join(" ");
}

function normalizeSupplierText(value: string | null | undefined, fallback: string): string {
  return normalizeOptionalText(value) ?? fallback;
}

function buildEvidenceRef(index: number): string {
  return `catalog:compare_suppliers:supplier:${index + 1}`;
}

function supplierMatchesLocation(supplier: Supplier, location: string | null): boolean {
  if (!location) return true;
  const address = normalizeOptionalText(supplier.address);
  if (!address) return false;
  return address.toLocaleLowerCase().includes(location.toLocaleLowerCase());
}

function buildSupplierSummary(supplier: Supplier): string {
  const facts: string[] = [];
  if (normalizeOptionalText(supplier.specialization)) facts.push("specialization evidence");
  if (normalizeOptionalText(supplier.address)) facts.push("location evidence");
  if (normalizeOptionalText(supplier.website)) facts.push("public website evidence");
  if (facts.length === 0) return "Supplier candidate from the safe-read supplier catalog.";
  return `Supplier candidate with ${facts.join(", ")}.`;
}

function toSupplierCard(params: {
  supplier: Supplier;
  index: number;
  location: string | null;
}): CompareSupplierCard {
  const supplierId = normalizeSupplierText(params.supplier.id, `supplier-${params.index + 1}`);
  const supplierName = normalizeSupplierText(params.supplier.name, supplierId);
  const riskFlags: string[] = [];
  if (!normalizeOptionalText(params.supplier.specialization)) {
    riskFlags.push("specialization_not_proven");
  }
  if (params.location && !supplierMatchesLocation(params.supplier, params.location)) {
    riskFlags.push("location_match_not_proven");
  }

  return {
    supplier_id: supplierId,
    supplier_name: supplierName,
    summary: buildSupplierSummary(params.supplier),
    risk_flags: riskFlags,
    evidence_ref: buildEvidenceRef(params.index),
  };
}

function collectRiskFlags(params: {
  cards: readonly CompareSupplierCard[];
  location: string | null;
}): string[] {
  const flags = new Set<string>();
  if (params.cards.length === 0) flags.add("no_supplier_candidates");
  flags.add("price_evidence_not_available_in_safe_read");
  flags.add("delivery_evidence_not_available_in_safe_read");
  if (params.location && params.cards.every((card) => card.risk_flags.includes("location_match_not_proven"))) {
    flags.add("location_match_not_proven");
  }
  for (const card of params.cards) {
    for (const flag of card.risk_flags) flags.add(flag);
  }
  return [...flags];
}

function buildRecommendationSummary(params: {
  materialCount: number;
  supplierCount: number;
  projectScoped: boolean;
  evidenceCount: number;
}): string {
  if (params.supplierCount === 0) {
    return `No supplier candidates found for ${params.materialCount} material id(s). Next action remains draft_request after human review.`;
  }
  const projectText = params.projectScoped ? " with project context" : "";
  return `Compared ${params.supplierCount} supplier candidate(s) for ${params.materialCount} material id(s)${projectText}; ${params.evidenceCount} evidence ref(s) must be reviewed before draft_request.`;
}

function isAuthenticated(auth: CompareSuppliersToolAuthContext | null): auth is CompareSuppliersToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

async function defaultListSuppliers(query: string, limit: number): Promise<readonly Supplier[]> {
  const rows = await listSuppliersViaTransport(query);
  return rows.slice(0, limit);
}

export async function runCompareSuppliersToolSafeRead(
  request: CompareSuppliersToolRequest,
): Promise<CompareSuppliersToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "COMPARE_SUPPLIERS_AUTH_REQUIRED",
        message: "compare_suppliers requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: COMPARE_SUPPLIERS_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "read_contract_plan") {
    return {
      ok: false,
      error: {
        code: "COMPARE_SUPPLIERS_ROLE_NOT_ALLOWED",
        message: "compare_suppliers is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "COMPARE_SUPPLIERS_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  try {
    const readSuppliers = request.listSuppliers ?? defaultListSuppliers;
    const query = buildSupplierSearchQuery(input.value);
    const rows = await readSuppliers(query, input.value.limit);
    const supplierCards = rows
      .slice(0, input.value.limit)
      .map((supplier, index) =>
        toSupplierCard({
          supplier,
          index,
          location: input.value.location,
        }),
      );
    const evidenceRefs = supplierCards.map((card) => card.evidence_ref);

    return {
      ok: true,
      data: {
        supplier_cards: supplierCards,
        price_range: {
          status: "not_available_in_safe_read",
          summary: "Supplier price range is not exposed by the current safe-read supplier contracts.",
        },
        delivery_range: {
          status: "not_available_in_safe_read",
          summary: "Supplier delivery range is not exposed by the current safe-read supplier contracts.",
        },
        risk_flags: collectRiskFlags({
          cards: supplierCards,
          location: input.value.location,
        }),
        recommendation_summary: buildRecommendationSummary({
          materialCount: input.value.material_ids.length,
          supplierCount: supplierCards.length,
          projectScoped: input.value.project_id !== null,
          evidenceCount: evidenceRefs.length,
        }),
        evidence_refs: evidenceRefs,
        next_action: COMPARE_SUPPLIERS_NEXT_ACTION,
        bounded: true,
        mutation_count: 0,
        no_supplier_confirmation: true,
        no_order_created: true,
        no_rfq_sent: true,
        warehouse_unchanged: true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "COMPARE_SUPPLIERS_READ_FAILED",
        message: error instanceof Error ? error.message : "compare_suppliers read failed",
      },
    };
  }
}
