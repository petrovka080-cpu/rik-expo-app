import { readMigration } from "./rlsCoverage.shared";

const source = readMigration("20260424110000_rls_chat_messages_phase1.sql");

describe("chat_messages RLS hardening phase 1", () => {
  it("creates chat_messages as an authenticated listing-thread chat boundary with revoked broad grants", () => {
    expect(source).toContain("create table if not exists public.chat_messages");
    expect(source).toContain("alter table public.chat_messages enable row level security;");
    expect(source).toContain("revoke all on table public.chat_messages from anon;");
    expect(source).toContain("revoke all on table public.chat_messages from authenticated;");
    expect(source).toContain("grant select, insert on table public.chat_messages to authenticated;");
    expect(source).toContain("grant update (read_by, is_deleted) on table public.chat_messages to authenticated;");
    expect(source).not.toMatch(
      /grant\s+delete\s+on\s+table\s+public\.chat_messages\s+to\s+(anon|authenticated)/i,
    );
  });

  it("ties listing-thread reads to authenticated access while keeping own-row visibility", () => {
    expect(source).toContain("create policy chat_messages_select_authenticated_listing_scope");
    expect(source).toContain("for select");
    expect(source).toContain("to authenticated");
    expect(source).toContain("user_id = auth.uid()");
    expect(source).toContain("or public.chat_messages_listing_visible_v1(supplier_id)");
    expect(source).toContain("create or replace function public.chat_messages_listing_visible_v1(p_supplier_id uuid)");
    expect(source).toContain("from public.market_listings ml");
  });

  it("constrains inserts to the authenticated actor and a company they can legitimately claim", () => {
    expect(source).toContain("create policy chat_messages_insert_authenticated_own");
    expect(source).toContain("for insert");
    expect(source).toContain("user_id = auth.uid()");
    expect(source).toContain("public.chat_messages_actor_can_claim_company_v1(company_id)");
    expect(source).toContain("create or replace function public.chat_messages_actor_can_claim_company_v1(p_company_id uuid)");
    expect(source).toContain("from public.companies c");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("message_type <> 'text'");
    expect(source).toContain("length(btrim(coalesce(content, ''))) between 1 and 4000");
  });

  it("keeps update surface narrow and guards non-author updates to append-only read receipts", () => {
    expect(source).toContain("create policy chat_messages_update_author_authenticated");
    expect(source).toContain("create policy chat_messages_update_read_receipt_authenticated");
    expect(source).toContain("grant update (read_by, is_deleted) on table public.chat_messages to authenticated;");
    expect(source).toContain("create or replace function public.chat_messages_non_author_read_by_guard_v1()");
    expect(source).toContain("chat_messages non-author update may only append read receipts");
    expect(source).toContain("chat_messages non-author update may not change is_deleted");
    expect(source).toContain("create trigger trg_chat_messages_non_author_read_by_guard_v1");
    expect(source).not.toMatch(/for\s+delete\s+to\s+authenticated/i);
  });
});
