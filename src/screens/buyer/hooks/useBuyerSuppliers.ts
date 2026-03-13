import { useEffect, useState } from "react";

import { listSuppliers, type Supplier } from "../../../lib/catalog_api";
import { supabase } from "../../../lib/supabaseClient";

export type BuyerCounterpartySuggestion = {
  name: string;
  role: "supplier" | "contractor" | "both" | "other";
};

export type BuyerCounterpartySourceDiag = {
  source: "suppliers" | "contractors" | "subcontracts" | "proposal_items";
  ok: boolean;
  rows: number;
  query: string;
  error: string | null;
};

const logBuyerSuppliersDiag = (diag: BuyerCounterpartySourceDiag) => {
  if (!__DEV__) return;
  if (!diag.ok) {
    console.warn(
      `[buyer.suppliers] source=${diag.source} ok=false query=${diag.query} error=${diag.error ?? "unknown"} rows=${diag.rows}`,
    );
    return;
  }
  console.info(`[buyer.suppliers] source=${diag.source} ok=true rows=${diag.rows}`);
};

export function useBuyerSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [counterparties, setCounterparties] = useState<BuyerCounterpartySuggestion[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [sourceDiag, setSourceDiag] = useState<BuyerCounterpartySourceDiag[]>([]);

  useEffect(() => {
    (async () => {
      if (suppliersLoaded) return;
      try {
        const loadWithPlans = async (
          source: BuyerCounterpartySourceDiag["source"],
          plans: Array<{ query: string; run: () => Promise<any> }>,
        ) => {
          let lastErr: string | null = null;
          for (const plan of plans) {
            try {
              const q = await plan.run();
              const err = q?.error ? String(q.error?.message ?? q.error) : null;
              if (!err) {
                const rows = Array.isArray(q?.data) ? q.data : [];
                return {
                  rows,
                  diag: { source, ok: true, rows: rows.length, query: plan.query, error: null } as BuyerCounterpartySourceDiag,
                };
              }
              lastErr = err;
            } catch (e: any) {
              lastErr = String(e?.message ?? e);
            }
          }
          return {
            rows: [] as any[],
            diag: {
              source,
              ok: false,
              rows: 0,
              query: plans[plans.length - 1]?.query ?? "unknown",
              error: lastErr || "unknown error",
            } as BuyerCounterpartySourceDiag,
          };
        };

        // Source loading must be resilient: one broken branch (e.g. subcontracts schema drift)
        // must not collapse whole inbox counterparty selection.
        const [
          supplierRowsS,
          contractorsS,
          subcontractsProbeS,
          proposalSuppliersS,
        ] = await Promise.allSettled([
          listSuppliers(),
          loadWithPlans("contractors", [
            {
              query: 'contractors.select("id,company_name,phone,inn").order("company_name")',
              run: async () =>
                await supabase
                  .from("contractors")
                  .select("id,company_name,phone,inn")
                  .order("company_name", { ascending: true }),
            },
            {
              query: 'contractors.select("*").limit(3000)',
              run: async () => await supabase.from("contractors").select("*").limit(3000),
            },
          ]),
          loadWithPlans("subcontracts", [
            {
              query: 'subcontracts.select("*").limit(2000)',
              run: async () => await supabase.from("subcontracts").select("*").limit(2000),
            },
          ]),
          loadWithPlans("proposal_items", [
            {
              query: 'proposal_items.select("supplier").not("supplier","is",null).limit(3000)',
              run: async () =>
                await supabase
                  .from("proposal_items")
                  .select("supplier")
                  .not("supplier", "is", null)
                  .limit(3000),
            },
            {
              query: 'proposal_items.select("*").limit(3000)',
              run: async () => await supabase.from("proposal_items").select("*").limit(3000),
            },
          ]),
        ]);

        const supplierRows =
          supplierRowsS.status === "fulfilled" && Array.isArray(supplierRowsS.value)
            ? supplierRowsS.value
            : [];
        const suppliersDiag: BuyerCounterpartySourceDiag = {
          source: "suppliers",
          ok: supplierRows.length > 0 || supplierRowsS.status === "fulfilled",
          rows: supplierRows.length,
          query: "catalog_api.listSuppliers()",
          error:
            supplierRowsS.status === "rejected"
              ? String((supplierRowsS.reason as any)?.message ?? supplierRowsS.reason)
              : null,
        };
        const contractorsL =
          contractorsS.status === "fulfilled"
            ? contractorsS.value
            : {
              rows: [],
              diag: {
                source: "contractors" as const,
                ok: false,
                rows: 0,
                query: "contractors:unknown",
                error: String((contractorsS.reason as any)?.message ?? contractorsS.reason),
              },
            };
        const subcontractsL =
          subcontractsProbeS.status === "fulfilled"
            ? subcontractsProbeS.value
            : {
              rows: [],
              diag: {
                source: "subcontracts" as const,
                ok: false,
                rows: 0,
                query: "subcontracts:unknown",
                error: String((subcontractsProbeS.reason as any)?.message ?? subcontractsProbeS.reason),
              },
            };
        const proposalSuppliersL =
          proposalSuppliersS.status === "fulfilled"
            ? proposalSuppliersS.value
            : {
              rows: [],
              diag: {
                source: "proposal_items" as const,
                ok: false,
                rows: 0,
                query: "proposal_items:unknown",
                error: String((proposalSuppliersS.reason as any)?.message ?? proposalSuppliersS.reason),
              },
            };

        const diags: BuyerCounterpartySourceDiag[] = [
          suppliersDiag,
          contractorsL.diag,
          subcontractsL.diag,
          proposalSuppliersL.diag,
        ];
        setSourceDiag(diags);
        for (const d of diags) {
          logBuyerSuppliersDiag(d);
        }

        const counterpartiesList: BuyerCounterpartySuggestion[] = [];
        const seenCounterparties = new Set<string>();
        const pushCounterparty = (name: string, role: BuyerCounterpartySuggestion["role"]) => {
          const key = `${role}:${String(name || "").trim().toLowerCase()}`;
          if (!name || seenCounterparties.has(key)) return;
          seenCounterparties.add(key);
          counterpartiesList.push({ name, role });
        };

        const list: Supplier[] = [];
        for (const row of supplierRows || []) {
          const name = String(row?.name ?? "").trim();
          if (!name) continue;
          list.push(row);
          pushCounterparty(name, "supplier");
        }

        const contractors = Array.isArray(contractorsL.rows) ? contractorsL.rows : [];
        for (const row of contractors as any[]) {
          const name = String(
            row?.company_name ?? row?.name ?? row?.organization ?? row?.org_name ?? "",
          ).trim();
          if (!name) continue;

          list.push({
            id: `contractor:${String(row?.id ?? name)}`,
            name,
            inn: row?.inn ?? null,
            phone: row?.phone ?? null,
            bank_account: null,
            specialization: null,
            email: null,
            website: null,
            address: null,
            contact_name: null,
            notes: "Source: contractors",
          });

          pushCounterparty(name, "contractor");
        }

        const subcontractRows = Array.isArray(subcontractsL.rows) ? subcontractsL.rows : [];
        for (const row of subcontractRows as any[]) {
          const sourceRole = String(
            row?.counterparty_type ??
              row?.party_role ??
              row?.role ??
              "",
          )
            .trim()
            .toLowerCase();
          const roleHint: BuyerCounterpartySuggestion["role"] =
            sourceRole.includes("supplier")
              ? "supplier"
              : sourceRole.includes("contractor") || sourceRole.includes("work") || sourceRole.includes("service")
                ? "contractor"
                : "both";
          const variants = [
            String(row?.contractor_org ?? "").trim(),
            String(row?.subcontractor_org ?? "").trim(),
            String(row?.supplier_org ?? "").trim(),
            String(row?.company_name ?? "").trim(),
            String(row?.organization ?? "").trim(),
          ].filter(Boolean);
          for (const name of variants) {
            list.push({
              id: `subcontractor:${String(row?.id ?? name)}:${name}`,
              name,
              inn: row?.contractor_inn ?? row?.supplier_inn ?? row?.inn ?? null,
              phone: row?.contractor_phone ?? row?.supplier_phone ?? row?.phone ?? null,
              bank_account: null,
              specialization: null,
              email: null,
              website: null,
              address: null,
              contact_name: null,
              notes: "Source: subcontracts contractor org",
            });
            // Subcontracts can carry either contractor-like or supplier-like entities depending on schema variant.
            pushCounterparty(name, roleHint);
          }
        }

        const proposalSuppliers = Array.isArray(proposalSuppliersL.rows) ? proposalSuppliersL.rows : [];
        for (const row of proposalSuppliers as any[]) {
          const name = String(row?.supplier ?? row?.supplier_name ?? row?.company_name ?? "").trim();
          if (!name) continue;
          // Historical supplier labels keep rejected/rework flow usable even if catalog row was not created yet.
          pushCounterparty(name, "supplier");
        }

        setSuppliers(list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru")));
        setCounterparties(
          counterpartiesList
            .filter((row) => row.name)
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru")),
        );
      } catch (error) {
        console.warn("[buyer] suppliers load failed", error);
      } finally {
        setSuppliersLoaded(true);
      }
    })();
  }, [suppliersLoaded]);

  const hasAnyOptions = counterparties.length > 0;
  const hasHardFailure = suppliersLoaded && !hasAnyOptions;
  return { suppliers, counterparties, sourceDiag, hasAnyOptions, hasHardFailure };
}
