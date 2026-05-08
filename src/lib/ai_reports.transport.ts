import { supabase } from "./supabaseClient";

export type AiReportUpsertTransportInput = {
  id: string;
  companyId?: string | null;
  userId?: string | null;
  role?: string | null;
  context?: string | null;
  title?: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
};

export async function loadAiConfigRow(id: string) {
  return await supabase
    .from("ai_configs" as never)
    .select("content")
    .eq("id", id)
    .maybeSingle();
}

export async function upsertAiReport(input: AiReportUpsertTransportInput) {
  return await supabase.from("ai_reports" as never).upsert({
    id: input.id,
    company_id: input.companyId || null,
    user_id: input.userId || null,
    role: input.role || null,
    context: input.context || null,
    title: input.title || null,
    content: input.content,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  } as never);
}

export async function loadProposalHistoryRowsTransport(rikCode: string) {
  const query = supabase
    .from("proposal_items")
    .select("price, supplier, created_at")
    .eq("rik_code", rikCode)
    .not("price", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return await query;
}
