import { supabase } from "../../../lib/supabaseClient";
import { normalizePage } from "../../../lib/api/_core";

type ProposalNoRow = {
  id?: string | number | null;
  proposal_no?: string | null;
};

const BUYER_PROPOSAL_NOS_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

export async function fetchBuyerProposalNos(proposalIds: string[]) {
  const ids = Array.from(new Set((proposalIds || []).map(String).filter(Boolean)));
  if (!ids.length) return { data: [] as ProposalNoRow[], error: null };

  const rows: ProposalNoRow[] = [];
  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, BUYER_PROPOSAL_NOS_PAGE_DEFAULTS);
    const { data, error } = await supabase
      .from("proposals")
      .select("id, proposal_no")
      .in("id", ids)
      .order("id", { ascending: true })
      .range(page.from, page.to);

    if (error) return { data: rows, error };
    const pageRows = Array.isArray(data) ? (data as ProposalNoRow[]) : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
}
