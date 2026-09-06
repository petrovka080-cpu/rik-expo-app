import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), "utf8");

describe("R4-A10 definition-passport public identity contract", () => {
  test("database revision identity uses the immutable definition title with an explicit legacy fallback", () => {
    const migration = read("supabase/migrations/20260906120000_r4a10_definition_passport_public_identity.sql");
    expect(migration).toContain("definition.passport ->> 'canonicalRuName'");
    expect(migration).toContain("identity.title_ru");
    expect(migration).toContain("new.canonical_work_title_ru := v_definition_title");
    expect(migration).toContain("v_identity ->> 'canonicalWorkTitleRu' <> v_definition_title");
  });

  test("local and production compilers load passport identity and PDFs prefer the committed revision title", () => {
    const local = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    const worker = read("supabase/functions/canonical-estimate-worker/index.ts");
    expect(local).toContain("resolved.definition_version,resolved.passport,identity.title_ru");
    expect(local).toContain("revision.canonical_work_title_ru");
    expect(worker).toContain('select("id,definition_version,catalog_id,passport")');
    expect(worker).toContain("revision.canonical_work_title_ru ?? revision.display_title_ru");
  });
});
