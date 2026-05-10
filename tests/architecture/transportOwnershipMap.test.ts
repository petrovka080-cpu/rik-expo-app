import fs from "fs";
import path from "path";

import {
  type DirectSupabaseOperation,
  scanDirectSupabaseBypasses,
} from "../../scripts/architecture_anti_regression_suite";

const docPath = path.join(process.cwd(), "docs/architecture/transport_ownership_map.md");
const providerSurfaces: readonly DirectSupabaseOperation[] = [
  "auth",
  "read",
  "realtime",
  "rpc",
  "storage",
  "write",
];

const emptySurfaceSummary = (): Record<DirectSupabaseOperation, { findings: number; files: Set<string> }> => ({
  auth: { findings: 0, files: new Set<string>() },
  read: { findings: 0, files: new Set<string>() },
  realtime: { findings: 0, files: new Set<string>() },
  rpc: { findings: 0, files: new Set<string>() },
  storage: { findings: 0, files: new Set<string>() },
  write: { findings: 0, files: new Set<string>() },
});

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

    expect(transportFiles).toHaveLength(87);
    for (const file of transportFiles) {
      expect(doc).toContain(file);
    }
  });

  it("keeps scanner baseline and provider surface counts in sync with the document", () => {
    const doc = fs.readFileSync(docPath, "utf8");
    const findings = scanDirectSupabaseBypasses(process.cwd());
    const transportFindings = findings.filter((finding) => finding.classification === "transport_controlled");
    const serviceBypassFiles = new Set(
      findings.filter((finding) => finding.classification === "service_bypass").map((finding) => finding.file),
    );
    const transportFiles = new Set(transportFindings.map((finding) => finding.file));
    const testOnlyFindings = findings.filter((finding) => finding.classification === "test_only");
    const generatedOrIgnoredFindings = findings.filter(
      (finding) => finding.classification === "generated_or_ignored",
    );
    const surfaceSummary = emptySurfaceSummary();

    for (const finding of transportFindings) {
      surfaceSummary[finding.operation].findings += 1;
      surfaceSummary[finding.operation].files.add(finding.file);
    }

    expect(doc).toContain(`- Total direct Supabase findings: ${findings.length}`);
    expect(doc).toContain(`- Transport-controlled findings: ${transportFindings.length}`);
    expect(doc).toContain(`- Transport-owned files with provider findings: ${transportFiles.size}`);
    expect(doc).toContain("- Service bypass findings: 0");
    expect(doc).toContain(`- Service bypass files: ${serviceBypassFiles.size}`);
    expect(doc).toContain(`- Test-only findings: ${testOnlyFindings.length}`);
    expect(doc).toContain(`- Generated or ignored findings: ${generatedOrIgnoredFindings.length}`);

    for (const surface of providerSurfaces) {
      const summary = surfaceSummary[surface];
      expect(doc).toContain(`- ${surface}: ${summary.findings} findings across ${summary.files.size} files`);
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
