import fs from "fs";
import path from "path";

import {
  buildDirectorProductionReportDocumentScope,
  buildDirectorProductionReportManifestContract,
  DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION,
  DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND,
  DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION,
  DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION,
} from "./directorPdfPlatformContract";

describe("directorProductionReport manifest contract (PDF-Z2)", () => {
  // ── document scope ──────────────────────────────────────────────────────────

  describe("buildDirectorProductionReportDocumentScope", () => {
    it("normalizes ISO dates and returns correct shape", () => {
      const scope = buildDirectorProductionReportDocumentScope({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced",
      });
      expect(scope).toEqual({
        role: "director",
        family: "reports",
        report: "production",
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced",
      });
    });

    it("treats null / empty objectName as null", () => {
      const scope = buildDirectorProductionReportDocumentScope({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: null,
        preferPriceStage: "priced",
      });
      expect(scope.objectName).toBeNull();
    });

    it("defaults preferPriceStage to priced when not base", () => {
      const scope = buildDirectorProductionReportDocumentScope({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
      });
      expect(scope.preferPriceStage).toBe("priced");
    });

    it("rejects non-ISO-format dates and returns null", () => {
      const scope = buildDirectorProductionReportDocumentScope({
        periodFrom: "not-a-date",
        periodTo: "31/03/2026",
      });
      expect(scope.periodFrom).toBeNull();
      expect(scope.periodTo).toBeNull();
    });
  });

  // ── manifest contract ───────────────────────────────────────────────────────

  describe("buildDirectorProductionReportManifestContract", () => {
    it("returns correct structure with all required fields", async () => {
      const contract = await buildDirectorProductionReportManifestContract({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced",
        clientSourceFingerprint: "abc123",
      });

      expect(contract.version).toBe(DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION);
      expect(contract.documentKind).toBe(DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND);
      expect(contract.templateVersion).toBe(DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION);
      expect(contract.renderContractVersion).toBe(DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION);
      expect(typeof contract.sourceVersion).toBe("string");
      expect(typeof contract.artifactVersion).toBe("string");
      expect(contract.sourceVersion.startsWith("dpr_src_v1_")).toBe(true);
      expect(contract.artifactVersion.startsWith("dpr_art_v1_")).toBe(true);
      expect(contract.artifactPath).toContain("director/production_report/artifacts/v1/");
      expect(contract.manifestPath).toContain("director/production_report/manifests/v1/");
      expect(contract.fileName).toBe("director_production_report.pdf");
      expect(contract.lastSourceChangeAt).toBeNull();
    });

    // PDF-Z2.3: same business data → same source_version
    it("same data → same source_version (stability)", async () => {
      const args = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced" as const,
        clientSourceFingerprint: "fp_stable_123",
      };
      const a = await buildDirectorProductionReportManifestContract(args);
      const b = await buildDirectorProductionReportManifestContract(args);
      expect(a.sourceVersion).toBe(b.sourceVersion);
    });

    it("same data → same artifact_version (stability)", async () => {
      const args = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced" as const,
        clientSourceFingerprint: "fp_stable_123",
      };
      const a = await buildDirectorProductionReportManifestContract(args);
      const b = await buildDirectorProductionReportManifestContract(args);
      expect(a.artifactVersion).toBe(b.artifactVersion);
    });

    // PDF-Z2.3: changing meaningful data → new source_version
    it("changed objectName → new source_version", async () => {
      const base = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        preferPriceStage: "priced" as const,
        clientSourceFingerprint: "fp_abc",
      };
      const a = await buildDirectorProductionReportManifestContract({ ...base, objectName: "Object A" });
      const b = await buildDirectorProductionReportManifestContract({ ...base, objectName: "Object B" });
      expect(a.sourceVersion).not.toBe(b.sourceVersion);
    });

    it("changed periodFrom → new source_version", async () => {
      const base = {
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced" as const,
        clientSourceFingerprint: "fp_abc",
      };
      const a = await buildDirectorProductionReportManifestContract({ ...base, periodFrom: "2026-03-01" });
      const b = await buildDirectorProductionReportManifestContract({ ...base, periodFrom: "2026-02-01" });
      expect(a.sourceVersion).not.toBe(b.sourceVersion);
    });

    it("changed clientSourceFingerprint → new source_version", async () => {
      const base = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced" as const,
      };
      const a = await buildDirectorProductionReportManifestContract({ ...base, clientSourceFingerprint: "fp_v1" });
      const b = await buildDirectorProductionReportManifestContract({ ...base, clientSourceFingerprint: "fp_v2" });
      expect(a.sourceVersion).not.toBe(b.sourceVersion);
    });

    it("changed preferPriceStage → new source_version", async () => {
      const base = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        clientSourceFingerprint: "fp_abc",
      };
      const a = await buildDirectorProductionReportManifestContract({ ...base, preferPriceStage: "priced" });
      const b = await buildDirectorProductionReportManifestContract({ ...base, preferPriceStage: "base" });
      expect(a.sourceVersion).not.toBe(b.sourceVersion);
    });

    // PDF-Z2.3: noise immunity — non-business fields must NOT change source_version
    it("null vs undefined clientSourceFingerprint → same source_version", async () => {
      const base = {
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced" as const,
      };
      const a = await buildDirectorProductionReportManifestContract({ ...base, clientSourceFingerprint: null });
      const b = await buildDirectorProductionReportManifestContract({ ...base, clientSourceFingerprint: undefined });
      expect(a.sourceVersion).toBe(b.sourceVersion);
    });

    it("artifact_version differs from source_version (independent hashes)", async () => {
      const contract = await buildDirectorProductionReportManifestContract({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: "Object A",
        preferPriceStage: "priced",
        clientSourceFingerprint: "fp_abc",
      });
      expect(contract.artifactVersion).not.toBe(contract.sourceVersion);
    });

    it("storage paths include sanitized version segments", async () => {
      const contract = await buildDirectorProductionReportManifestContract({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        clientSourceFingerprint: "fp_path_test",
      });
      // Path segments must not contain raw whitespace or unsafe characters
      expect(contract.artifactPath).toMatch(/^director\/production_report\/artifacts\/v1\/[a-zA-Z0-9._-]+\//);
      expect(contract.manifestPath).toMatch(/^director\/production_report\/manifests\/v1\/[a-zA-Z0-9._-]+\.json$/);
    });
  });
});

describe("directorProductionReport PDF-Z2 DB volatility migration", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20260420120000_pdf_z2_director_production_report_rpc_volatility.sql",
  );
  const source = fs.readFileSync(migrationPath, "utf8");
  const normalized = source.toLowerCase();

  it("marks only the production report HTTP RPC wrappers as volatile", () => {
    expect(source).toContain(
      "alter function public.director_report_transport_scope_v1(date, date, text, boolean, boolean)",
    );
    expect(source).toContain(
      "alter function public.pdf_director_production_source_v1(text, text, text, boolean)",
    );
    expect(normalized).toContain("volatile");
    expect(source).not.toContain("create or replace function public.director_report_transport_scope_v1");
    expect(source).not.toContain("create or replace function public.pdf_director_production_source_v1");
    expect(source).not.toContain("create or replace function public.director_report_fetch_works_v1");
  });

  it("documents why volatility is required without changing PDF semantics", () => {
    expect(source).toContain("director_report_fetch_works_v1, which records runtime metrics");
    expect(source).toContain("PostgREST read-only transaction failures");
    expect(source).toContain("without changing PDF formulas, grouping, ordering, or template semantics");
  });

  it("keeps an apply-time guard and reloads PostgREST schema", () => {
    expect(source).toContain("PDF-Z2 volatility guard failed");
    expect(source).toContain(
      "'public.director_report_transport_scope_v1(date,date,text,boolean,boolean)'::regprocedure",
    );
    expect(source).toContain(
      "'public.pdf_director_production_source_v1(text,text,text,boolean)'::regprocedure",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
