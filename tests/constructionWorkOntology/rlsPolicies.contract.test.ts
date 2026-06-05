import { readArtifactJson, readMigration, REQUIRED_TABLES } from "./constructionWorkOntologyTestHelpers";

it("enables RLS and keeps anonymous writes closed for every new table", () => {
  const sql = readMigration();
  const matrix = readArtifactJson<Record<string, unknown>>("rls_policy_matrix.json");

  for (const table of REQUIRED_TABLES) {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`);
    expect(sql).toContain(`grant select on table public.${table} to authenticated`);
    expect(sql).toContain(`grant select, insert, update, delete on table public.${table} to service_role`);
  }

  expect(sql).toMatch(/for select\s+to authenticated/i);
  expect(sql).toMatch(/for all\s+to service_role/i);
  expect(matrix).toEqual(
    expect.objectContaining({
      all_new_tables_rls_enabled: true,
      anonymous_write_allowed: false,
      authenticated_read_active_allowed: true,
      service_role_write_allowed: true,
      cross_user_private_data_exposed: false,
      catalog_items_rls_changed: false,
      fake_green_claimed: false,
    }),
  );
});
