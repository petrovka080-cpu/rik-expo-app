import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

const publicationContracts: Array<{ migration: string; tables: string[] }> = [
  {
    migration: "20260327233000_selective_realtime_publication_v1.sql",
    tables: ["notifications", "requests", "request_items", "proposals", "proposal_payments", "wh_incoming_items"],
  },
  {
    migration: "20260329013000_realtime_publication_wave2_contractor.sql",
    tables: ["contractors", "subcontracts", "purchase_items", "work_progress"],
  },
  {
    migration: "20260329073000_director_realtime_wave3_publication.sql",
    tables: ["warehouse_issues", "warehouse_issue_items"],
  },
];

it("keeps realtime publication migrations replay-safe when remote-history tables are absent", () => {
  for (const contract of publicationContracts) {
    const lower = fs.readFileSync(path.join(migrationsDir, contract.migration), "utf8").toLowerCase();

    for (const table of contract.tables) {
      expect(lower).toContain(`to_regclass('public.${table}') is not null`);
      expect(lower).toContain(`alter publication supabase_realtime add table public.${table}`);
    }

    expect(lower).not.toContain("catalog_items");
    expect(lower).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
    expect(lower).not.toMatch(/\btruncate\b/);
    expect(lower).not.toMatch(/\bdelete\s+from\b/);
  }
});
