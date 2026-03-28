import type {
  CatalogItem,
  CatalogSearchFallbackRow,
  CatalogSearchRpcRow,
  ProfileContractorCompatRow,
  RikQuickSearchFallbackRow,
  RikQuickSearchItem,
  RikQuickSearchRpcRow,
  Supplier,
  SupplierTableRow,
  SuppliersListRpcRow,
  UnifiedCounterpartyType,
} from "./catalog.types";

export const norm = (value?: string | null) => String(value ?? "").trim();

export const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

export const sanitizePostgrestOrTerm = (value: string): string =>
  norm(value)
    .replace(/[,%()]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const mapSupplierRow = (raw: SupplierTableRow | SuppliersListRpcRow): Supplier | null => {
  const id = raw.id;
  const name = norm(raw.name);
  if (!id || !name) return null;
  const legacyComment = "comment" in raw ? raw.comment ?? null : null;
  return {
    id: String(id),
    name,
    inn: raw.inn ?? null,
    bank_account: raw.bank_account ?? null,
    specialization: raw.specialization ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    website: raw.website ?? null,
    address: raw.address ?? null,
    contact_name: raw.contact_name ?? null,
    notes: raw.notes ?? legacyComment,
  };
};

export const mapSupplierRows = (rows: Array<SupplierTableRow | SuppliersListRpcRow>): Supplier[] =>
  rows
    .map(mapSupplierRow)
    .filter((row): row is Supplier => !!row)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

const mapCatalogSearchRow = (
  raw: CatalogSearchRpcRow | CatalogSearchFallbackRow,
): CatalogItem | null => {
  const code = norm(raw.rik_code ?? ("code" in raw ? raw.code : null));
  if (!code) return null;
  const fallbackName = "name" in raw ? raw.name : null;
  const fallbackUom = "uom" in raw ? raw.uom : null;
  return {
    code,
    name: norm(raw.name_human ?? fallbackName ?? code) || code,
    uom: raw.uom_code ?? fallbackUom ?? null,
    sector_code: raw.sector_code ?? null,
    spec: raw.spec ?? null,
    kind: raw.kind ?? null,
    group_code: raw.group_code ?? null,
  };
};

export const mapCatalogSearchRows = (
  rows: Array<CatalogSearchRpcRow | CatalogSearchFallbackRow>,
): CatalogItem[] =>
  rows
    .map(mapCatalogSearchRow)
    .filter((row): row is CatalogItem => !!row);

const mapRikQuickSearchRpcRow = (row: RikQuickSearchRpcRow): RikQuickSearchItem | null => {
  const rikCode = norm(row.rik_code ?? row.code);
  if (!rikCode) return null;
  const nameHuman =
    norm(row.name_human ?? row.name ?? row.name_ru ?? row.item_name ?? rikCode) || rikCode;
  return {
    rik_code: rikCode,
    name_human: nameHuman,
    name_human_ru: row.name_human_ru ?? row.name_human ?? row.name_ru ?? null,
    uom_code: row.uom_code ?? row.uom ?? null,
    kind: row.kind ?? null,
    apps: null,
  };
};

const mapRikQuickSearchFallbackRow = (
  row: RikQuickSearchFallbackRow,
): RikQuickSearchItem | null => {
  const rikCode = norm(row.rik_code);
  if (!rikCode) return null;
  return {
    rik_code: rikCode,
    name_human: norm(row.name_human ?? rikCode) || rikCode,
    name_human_ru: row.name_human_ru ?? row.name_human ?? null,
    uom_code: row.uom_code ?? null,
    kind: row.kind ?? null,
    apps: null,
  };
};

export const mapRikQuickSearchRpcRows = (rows: RikQuickSearchRpcRow[]): RikQuickSearchItem[] =>
  rows
    .map(mapRikQuickSearchRpcRow)
    .filter((item): item is RikQuickSearchItem => !!item);

export const mapRikQuickSearchFallbackRows = (
  rows: RikQuickSearchFallbackRow[],
): RikQuickSearchItem[] =>
  rows
    .map(mapRikQuickSearchFallbackRow)
    .filter((item): item is RikQuickSearchItem => !!item);

export const normCounterpartyName = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export const normInnDigits = (value: unknown): string =>
  String(value ?? "").replace(/\D+/g, "").trim();

export const makeCounterpartyKey = (name: string, inn?: string | null): string => {
  const innKey = normInnDigits(inn);
  if (innKey) return `inn:${innKey}`;
  return `name:${normCounterpartyName(name)}`;
};

export const pushUnique = <T,>(arr: T[], value: T) => {
  if (!arr.includes(value)) arr.push(value);
};

export const detectUnifiedType = (origins: string[]): UnifiedCounterpartyType => {
  const hasSupplier = origins.includes("supplier");
  const hasContractor = origins.includes("subcontract");
  if (hasSupplier && hasContractor) return "supplier_and_contractor";
  if (hasSupplier) return "supplier";
  if (hasContractor) return "contractor";
  return "other_business_counterparty";
};

export const resolveProfileDisplayName = (row: ProfileContractorCompatRow): string =>
  norm(
    row.company ??
      row.company_name ??
      row.organization ??
      row.org_name ??
      row.name ??
      row.full_name,
  );
