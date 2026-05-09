import fs from "fs";
import path from "path";

import { scanDirectSupabaseBypasses } from "../../scripts/architecture_anti_regression_suite";

const docPath = path.join(process.cwd(), "docs/architecture/transport_ownership_map.md");

describe("transport ownership map", () => {
  it("documents every current runtime transport owner from the architecture scanner", () => {
    const doc = fs.readFileSync(docPath, "utf8");
    const findings = scanDirectSupabaseBypasses(process.cwd());
    const transportFiles = Array.from(
      new Set(
        findings
          .filter((finding) => finding.classification === "transport_controlled")
          .map((finding) => finding.file),
      ),
    ).sort();

    expect(transportFiles).toHaveLength(89);
    for (const file of transportFiles) {
      expect(doc).toContain(file);
    }
  });

  it("locks the no-bypass ownership semantics without promising production enablement", () => {
    const doc = fs.readFileSync(docPath, "utf8");

    expect(doc).toContain("Production feature enablement: NO");
    expect(doc).toContain("Deploy or OTA implied: NO");
    expect(doc).toContain("Realtime capacity changed: NO");
    expect(doc).toContain("`src/lib/supabaseClient.ts` is the irreducible root client initializer");
    expect(doc).toContain("Auth lifecycle listener ownership is in auth transport");
    expect(doc).toContain("Request item mutation ownership is in item mutation transport");
    expect(doc).toContain("The service layer owns validation, payload shaping, result mapping, and error semantics only");
    expect(doc).not.toMatch(/Production feature enablement:\s*YES/i);
    expect(doc).not.toMatch(/Production traffic migrated:\s*YES/i);
    expect(doc).not.toMatch(/Deploy or OTA implied:\s*YES/i);
    expect(doc).not.toMatch(/BFF enabled by default:\s*YES/i);
    expect(doc).not.toMatch(/Realtime capacity changed:\s*YES/i);
  });
});
