import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("H1.8 developer break-glass migration", () => {
  it("creates a dedicated override table with TTL and allowed-role constraints", () => {
    expect(source).toContain("create table if not exists public.developer_access_overrides");
    expect(source).toContain("allowed_roles text[]");
    expect(source).toContain("active_effective_role text null");
    expect(source).toContain("expires_at timestamptz null");
    expect(source).toContain("developer_access_overrides_allowed_roles_check");
    expect(source).toContain("developer_access_overrides_active_role_check");
  });

  it("logs override selections, denials, expiration, and RPC actions", () => {
    expect(source).toContain("create table if not exists public.developer_override_audit_log");
    expect(source).toContain("developer_effective_role_selected");
    expect(source).toContain("developer_override_denied");
    expect(source).toContain("developer_override_expired");
    expect(source).toContain("developer_override_rpc_action");
  });

  it("validates effective roles server-side before mutation impersonation", () => {
    expect(source).toContain("create or replace function public.developer_set_effective_role_v1");
    expect(source).toContain("not (v_role = any(v_row.allowed_roles))");
    expect(source).toContain("create or replace function public.app_actor_role_context_v1");
    expect(source).toContain("v_override_active and v_can_impersonate");
    expect(source).toContain("effective_role_not_allowed_for_action");
  });

  it("seeds only the known developer account without broad role expansion", () => {
    expect(source).toContain("9adc5ab1-31fa-41be-8a00-17eadbb37c39");
    expect(source).toContain("H1.8 developer verification break-glass for petrovka080@gmail.com");
    expect(source).not.toContain("array['buyer', 'director', 'warehouse', 'accountant', 'foreman', 'contractor', 'security', 'engineer']");
  });
});
