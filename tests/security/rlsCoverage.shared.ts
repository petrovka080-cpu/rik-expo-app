import fs from "node:fs";
import path from "node:path";

export const readMigration = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", name), "utf8");

export const expectRlsEnabledForTable = (source: string, tableName: string) => {
  expect(source).toContain(`alter table public.${tableName} enable row level security;`);
};

export const expectNoDirectTableGrant = (source: string, tableName: string) => {
  expect(source).not.toMatch(
    new RegExp(`grant\\s+.+\\s+on\\s+table\\s+public\\.${tableName}\\s+to\\s+(anon|authenticated)`, "i"),
  );
};

export const expectAuthenticatedExecuteGrant = (source: string, signature: string) => {
  expect(source).toContain(`grant execute on function public.${signature} to authenticated;`);
  expect(source).not.toContain(`grant execute on function public.${signature} to anon;`);
};
