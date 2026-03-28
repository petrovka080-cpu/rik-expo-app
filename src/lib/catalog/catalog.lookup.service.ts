import { recordCatalogWarning } from "./catalog.observability";
import {
  parseProfileContractorRows,
  parseSuppliersListRpcRows,
} from "./catalog.parsers";
import {
  detectUnifiedType,
  makeCounterpartyKey,
  mapSupplierRows,
  norm,
  normCounterpartyName,
  normInnDigits,
  pushUnique,
  resolveProfileDisplayName,
  sanitizePostgrestOrTerm,
} from "./catalog.normalizers";
import {
  loadContractorCounterpartyRows,
  loadContractorProfileRows,
  loadSubcontractCounterpartyRows,
  loadSupplierCounterpartyRows,
  loadSuppliersTableRows,
  runSuppliersListRpc,
} from "./catalog.transport";
import type {
  ContractorCounterpartyRow,
  ProfileContractorCompatRow,
  SubcontractCounterpartyRow,
  Supplier,
  SupplierCounterpartyRow,
  SupplierTableRow,
  UnifiedCounterparty,
} from "./catalog.types";

export async function listUnifiedCounterparties(search?: string): Promise<UnifiedCounterparty[]> {
  const q = sanitizePostgrestOrTerm(search || "");
  const byKey = new Map<string, UnifiedCounterparty>();

  try {
    const { data, error } = await loadSupplierCounterpartyRows(q);
    if (!error && Array.isArray(data)) {
      for (const raw of data as SupplierCounterpartyRow[]) {
        const display = norm(raw.name);
        if (!display) continue;
        const inn = norm(raw.inn) || null;
        const phone = norm(raw.phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: String(raw.id || key),
            display_name: display,
            inn,
            phone,
            source_origin: ["supplier"],
            counterparty_type: "supplier",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "supplier");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "list_unified_counterparties_suppliers_failed",
      operation: "listUnifiedCounterparties.suppliers",
      error,
      mode: "degraded",
      extra: {
        queryLength: q.length,
      },
    });
  }

  try {
    const { data, error } = await loadSubcontractCounterpartyRows();
    if (!error && Array.isArray(data)) {
      for (const raw of data as SubcontractCounterpartyRow[]) {
        const display = norm(raw.contractor_org);
        if (!display) continue;
        const inn = norm(raw.contractor_inn) || null;
        const phone = norm(raw.contractor_phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: `subcontract:${String(raw.id || key)}`,
            display_name: display,
            inn,
            phone,
            source_origin: ["subcontract"],
            counterparty_type: "contractor",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "subcontract");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "list_unified_counterparties_subcontracts_failed",
      operation: "listUnifiedCounterparties.subcontracts",
      error,
      mode: "degraded",
    });
  }

  try {
    const contractorsQ = await loadContractorCounterpartyRows();

    const loadProfilesSafe = async () => {
      const plans = [{ withFilter: true }, { withFilter: false }] as const;
      for (const plan of plans) {
        try {
          const res = await loadContractorProfileRows(plan.withFilter);
          if (res.error) continue;
          const rows = parseProfileContractorRows(res.data);
          if (plan.withFilter) return rows;
          return rows.filter((row) => Boolean(row.is_contractor));
        } catch (error) {
          recordCatalogWarning({
            screen: "request",
            event: "list_unified_counterparties_profile_lookup_failed",
            operation: "listUnifiedCounterparties.loadProfilesSafe",
            error,
            mode: "fallback",
            extra: {
              withFilter: plan.withFilter,
            },
          });
        }
      }
      return [] as ProfileContractorCompatRow[];
    };

    const profileRows = await loadProfilesSafe();

    if (!contractorsQ.error && Array.isArray(contractorsQ.data)) {
      for (const raw of contractorsQ.data as ContractorCounterpartyRow[]) {
        const display = norm(raw.company_name);
        if (!display) continue;
        const inn = norm(raw.inn) || null;
        const phone = norm(raw.phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: `contractor:${String(raw.id || key)}`,
            display_name: display,
            inn,
            phone,
            source_origin: ["registered_company"],
            counterparty_type: "other_business_counterparty",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "registered_company");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }

    for (const raw of profileRows) {
      const display = resolveProfileDisplayName(raw);
      if (!display) continue;
      const inn = norm(raw.inn) || null;
      const phone = norm(raw.phone) || null;
      const key = makeCounterpartyKey(display, inn);
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, {
          counterparty_id: `profile:${String(raw.user_id || key)}`,
          display_name: display,
          inn,
          phone,
          source_origin: ["registered_company"],
          counterparty_type: "other_business_counterparty",
          is_active: true,
          company_scope: null,
        });
      } else {
        pushUnique(prev.source_origin, "registered_company");
        if (!prev.inn && inn) prev.inn = inn;
        if (!prev.phone && phone) prev.phone = phone;
        prev.counterparty_type = detectUnifiedType(prev.source_origin);
      }
    }
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "list_unified_counterparties_registered_failed",
      operation: "listUnifiedCounterparties.registered",
      error,
      mode: "degraded",
    });
  }

  const rows = Array.from(byKey.values())
    .map((row) => ({
      ...row,
      counterparty_type: detectUnifiedType(row.source_origin),
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "ru"));

  if (!q) return rows;
  const nq = normCounterpartyName(q);
  const innQuery = normInnDigits(nq);
  return rows.filter(
    (row) =>
      normCounterpartyName(row.display_name).includes(nq) ||
      normInnDigits(row.inn).includes(innQuery),
  );
}

export async function listSuppliers(search?: string): Promise<Supplier[]> {
  const q = sanitizePostgrestOrTerm(search || "");

  try {
    const { data, error } = await runSuppliersListRpc(q || null);
    if (!error) {
      const mapped = mapSupplierRows(parseSuppliersListRpcRows(data));
      if (mapped.length) return mapped;
    } else {
      const msg = String(error.message || "");
      if (!msg.includes("does not exist")) {
        recordCatalogWarning({
          screen: "request",
          event: "list_suppliers_rpc_failed",
          operation: "listSuppliers.rpc",
          error,
          mode: "fallback",
          extra: {
            queryLength: q.length,
          },
        });
      }
    }
  } catch (error) {
    if (!String((error as Error)?.message ?? "").includes("does not exist")) {
      recordCatalogWarning({
        screen: "request",
        event: "list_suppliers_rpc_failed",
        operation: "listSuppliers.rpc",
        error,
        mode: "fallback",
        extra: {
          queryLength: q.length,
        },
      });
    }
  }

  try {
    const { data, error } = await loadSuppliersTableRows(q);
    if (error) throw error;
    if (Array.isArray(data)) {
      return mapSupplierRows(data as SupplierTableRow[]);
    }
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "list_suppliers_table_failed",
      operation: "listSuppliers.table",
      error,
      mode: "degraded",
      extra: {
        queryLength: q.length,
      },
    });
  }

  return [];
}
