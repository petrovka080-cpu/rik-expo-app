import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260420090100_n1_sec1_fn_calc_kit_basic_grant_hardening.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const lowerSource = source.toLowerCase();

const sqlWithoutComments = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--.*$/gm, "");

const statements = sqlWithoutComments
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const FN_SIGNATURE =
  String.raw`public\.fn_calc_kit_basic\s*\(\s*text\s*,\s*numeric\s*,\s*numeric\s*,\s*numeric\s*,\s*numeric\s*,\s*numeric\s*,\s*numeric\s*,\s*numeric\s*\)`;

describe("N1.SEC1 fn_calc_kit_basic grant hardening migration", () => {
  it("contains no temp-schema fallback anywhere", () => {
    expect(lowerSource).not.toContain("pg_temp");
  });

  it("targets exactly public.fn_calc_kit_basic with the correct signature", () => {
    expect(statements).toHaveLength(2);

    for (const statement of statements) {
      expect(statement).toMatch(new RegExp(FN_SIGNATURE, "i"));
    }

    const touchedFunctions = source.match(/public\.\w+\s*\(/gi) ?? [];
    expect(new Set(touchedFunctions.map((match) => match.toLowerCase()))).toEqual(
      new Set(["public.fn_calc_kit_basic("]),
    );
  });

  it("revokes execute from anon", () => {
    expect(statements[0]).toMatch(
      new RegExp(
        String.raw`^revoke\s+execute\s+on\s+function\s+${FN_SIGNATURE}\s+from\s+anon$`,
        "i",
      ),
    );
  });

  it("normalizes search_path to public only", () => {
    expect(statements[1]).toMatch(
      new RegExp(
        String.raw`^alter\s+function\s+${FN_SIGNATURE}\s+set\s+search_path\s*=\s*public$`,
        "i",
      ),
    );
  });

  it("does not perform extra SQL operations outside the wave scope", () => {
    expect(sqlWithoutComments).not.toMatch(/\b(create|drop|grant|notify)\b/i);
    expect(sqlWithoutComments).not.toMatch(/\bauthenticated\b/i);
    expect(sqlWithoutComments).not.toMatch(/\bsecurity\s+definer\b/i);
  });
});
