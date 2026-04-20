import fs from "fs";
import path from "path";
import {
  buildDirectorFinanceManagementDocumentScope,
  buildDirectorFinanceManagementManifestContract,
  DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND,
  DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION,
} from "../../src/lib/pdf/directorPdfPlatformContract";

describe("PDF-Z1 director finance management manifest contract", () => {
  const baseArgs = {
    periodFrom: "2026-04-01",
    periodTo: "2026-04-30",
    topN: 15,
    dueDaysDefault: 7,
    criticalDays: 14,
    evaluationDate: "2026-04-20",
    sourceKind: "rpc:pdf_director_finance_source_v1",
    financeRows: [
      {
        supplier: "Supplier A",
        amount: 1200,
        paidAmount: 400,
        approved_at: "2026-04-04",
        invoice_date: "2026-04-05",
        due_date: "2026-04-12",
        generated_at: "noise-a",
      },
    ],
    spendRows: [
      {
        supplier: "Supplier A",
        kind_name: "materials",
        approved_alloc: 1200,
        paid_alloc: 400,
        director_approved_at: "2026-04-04",
        trace_id: "noise-a",
      },
    ],
  };

  it("builds stable document scope defaults without UI-owned state", () => {
    expect(
      buildDirectorFinanceManagementDocumentScope({
        periodFrom: "2026-04-01T12:30:00Z",
        periodTo: "2026-04-30",
        topN: 0,
        dueDaysDefault: -1,
        criticalDays: 0,
        evaluationDate: "2026-04-20",
      }),
    ).toEqual({
      role: "director",
      family: "finance",
      report: "management",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      topN: 1,
      dueDaysDefault: 0,
      criticalDays: 1,
      evaluationDate: "2026-04-20",
    });
  });

  it("keeps source_version stable for identical business data", async () => {
    const first = await buildDirectorFinanceManagementManifestContract(baseArgs);
    const second = await buildDirectorFinanceManagementManifestContract({
      ...baseArgs,
      financeRows: JSON.parse(JSON.stringify(baseArgs.financeRows)),
      spendRows: JSON.parse(JSON.stringify(baseArgs.spendRows)),
    });

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(second.manifestPath).toBe(first.manifestPath);
  });

  it("bumps source_version when business data changes", async () => {
    const first = await buildDirectorFinanceManagementManifestContract(baseArgs);
    const changed = await buildDirectorFinanceManagementManifestContract({
      ...baseArgs,
      financeRows: [{ ...baseArgs.financeRows[0], paidAmount: 900 }],
    });

    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
    expect(changed.manifestPath).toBe(first.manifestPath);
  });

  it("ignores transport/generated noise in source_version", async () => {
    const first = await buildDirectorFinanceManagementManifestContract(baseArgs);
    const noisy = await buildDirectorFinanceManagementManifestContract({
      ...baseArgs,
      financeRows: [
        {
          ...baseArgs.financeRows[0],
          generated_at: "noise-b",
          request_id: "request-b",
          telemetry: { durationMs: 999 },
        },
      ],
      spendRows: [
        {
          ...baseArgs.spendRows[0],
          trace_id: "trace-b",
          timing: { totalMs: 999 },
        },
      ],
    });

    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });

  it("creates deterministic manifest and artifact paths for the finance management family", async () => {
    const contract = await buildDirectorFinanceManagementManifestContract(baseArgs);

    expect(contract.version).toBe(DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION);
    expect(contract.documentKind).toBe(DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND);
    expect(contract.templateVersion).toBe(DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION);
    expect(contract.renderContractVersion).toBe(DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION);
    expect(contract.artifactPath).toContain("director/management_report/artifacts/v1/");
    expect(contract.manifestPath).toContain("director/management_report/manifests/v1/");
    expect(contract.artifactPath).toContain(contract.artifactVersion);
    expect(contract.fileName).toBe("director_finance_management_report.pdf");
  });
});

describe("PDF-Z1 director-pdf-render finance management materialization", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "supabase/functions/director-pdf-render/index.ts"),
    "utf8",
  );

  it("checks deterministic artifact before Puppeteer render for finance management manifests", () => {
    const artifactCheck = source.indexOf("const cachedArtifact = await trySignExistingPdfArtifact");
    const renderStart = source.indexOf("const { pdfBytes, renderer } = await renderPdfBytes(payload.html);");

    expect(artifactCheck).toBeGreaterThan(0);
    expect(renderStart).toBeGreaterThan(artifactCheck);
    expect(source).toContain("finance_management_artifact_hit");
    expect(source).toContain("renderer: \"artifact_cache\"");
  });

  it("persists readiness transitions without touching viewer or templates", () => {
    expect(source).toContain("status: \"stale\"");
    expect(source).toContain("status: \"missing\"");
    expect(source).toContain("status: \"building\"");
    expect(source).toContain("status: \"ready\"");
    expect(source).toContain("status: \"failed\"");
    expect(source).toContain("DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION");
    expect(source).not.toContain("pdf-viewer");
  });
});
