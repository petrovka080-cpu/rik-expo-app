/**
 * Performance budget discipline tests.
 *
 * WAVE O: Establishes measurable, repeatable performance baselines
 * for the heaviest screens and ensures they stay within thresholds.
 *
 * These are architectural budget tests — they catch scope creep early,
 * before it becomes a runtime performance regression.
 *
 * Thresholds are set ~20% above the current measured baseline so they
 * only fail if something meaningfully worsens.
 */

import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "../../src");

function getFileStats(relativePath: string) {
  const fullPath = path.join(SRC, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  const sizeKB = Math.round(content.length / 1024);
  const importCount = (content.match(/^import\s/gm) || []).length;
  const lineCount = content.split("\n").length;
  return { sizeKB, importCount, lineCount };
}

describe("performance budget — screen size", () => {
  // Baseline 2026-04-14:
  //   OfficeHubScreen.tsx: 76KB, 14 imports
  //   BuyerScreen.tsx: 30KB, 63 imports
  //   BuyerSubcontractTab.tsx: 27KB, 12 imports
  //   useForemanSubcontractController.tsx: 40KB, 20 imports

  const budgets: {
    file: string;
    maxSizeKB: number;
    maxImports: number;
    maxLines: number;
  }[] = [
    {
      file: "screens/office/OfficeHubScreen.tsx",
      maxSizeKB: 90,   // baseline: 76KB
      maxImports: 20,   // baseline: 14
      maxLines: 2400,   // ~20% headroom
    },
    {
      file: "screens/buyer/BuyerScreen.tsx",
      maxSizeKB: 36,   // baseline: 30KB
      maxImports: 75,   // baseline: 63 (high but existing)
      maxLines: 1000,
    },
    {
      file: "screens/buyer/BuyerSubcontractTab.tsx",
      maxSizeKB: 32,   // baseline: 27KB
      maxImports: 18,   // baseline: 12
      maxLines: 1000,
    },
    {
      file: "screens/foreman/hooks/useForemanSubcontractController.tsx",
      maxSizeKB: 48,   // baseline: 40KB
      maxImports: 25,   // baseline: 20
      maxLines: 1200,
    },
  ];

  for (const budget of budgets) {
    describe(path.basename(budget.file), () => {
      const stats = getFileStats(budget.file);

      it(`size ≤ ${budget.maxSizeKB}KB (current: ${stats.sizeKB}KB)`, () => {
        expect(stats.sizeKB).toBeLessThanOrEqual(budget.maxSizeKB);
      });

      it(`imports ≤ ${budget.maxImports} (current: ${stats.importCount})`, () => {
        expect(stats.importCount).toBeLessThanOrEqual(budget.maxImports);
      });

      it(`lines ≤ ${budget.maxLines} (current: ${stats.lineCount})`, () => {
        expect(stats.lineCount).toBeLessThanOrEqual(budget.maxLines);
      });
    });
  }
});

describe("performance budget — bundle module count", () => {
  // Metro reported 2405 modules on 2026-04-14
  // Threshold: alert if source file count grows beyond ~20% above baseline
  it("source module count within budget", () => {
    const tsFiles = countFilesRecursive(SRC, /\.tsx?$/);
    const p3ATypeBoundaryFiles = countFilesRecursive(
      path.join(SRC, "types", "contracts"),
      /\.ts$/,
    );
    const v47BForemanNavigationFlowFiles = fs.existsSync(
      path.join(SRC, "screens", "foreman", "hooks", "useForemanNavigationFlow.ts"),
    ) ? 1 : 0;
    const v47CForemanFioBootstrapFlowFiles = fs.existsSync(
      path.join(SRC, "screens", "foreman", "hooks", "useForemanFioBootstrapFlow.ts"),
    ) ? 1 : 0;
    const s50kBffBoundaryScaffoldFiles = countFilesRecursive(
      path.join(SRC, "shared", "scale"),
      /\.ts$/,
    );
    // Baseline: 1008 source files. P2.K adds one permanent PDF viewer-entry boundary.
    // P3-A adds five permanent type-only database contract boundaries.
    // PDF-Z2 adds one permanent production report manifest contract test.
    // PDF-Z3 adds focused warehouse manifest/backend reuse tests.
    // PDF-Z4 adds focused Foreman manifest/backend reuse tests.
    // PDF-Z5 adds contractor act manifest/reuse contract plus focused tests.
    // PDF-PUR-1 adds buyer proposal manifest/reuse contract plus focused tests.
    // PDF-ACC-1 adds accountant payment report manifest/reuse contract plus focused tests.
    // PDF-ACC-FINAL adds exact accountant proposal/attachment manifest services plus focused tests.
    // A4 adds one reusable security redaction boundary plus focused regression tests.
    // A5 adds three buyer owner-boundary modules for sheet composition and sheet-local state.
    // B1 adds six permanent PDF viewer owner-boundary modules.
    // B2 adds eight permanent PDF document action owner-boundary modules.
    // OFFICE_OWNER_SPLIT adds four permanent Office owner-boundary modules
    // plus three focused src-owned regression tests for route/reentry/model.
    // FOREMAN_DRAFT_OWNER_SPLIT_FINAL adds four permanent Foreman draft boundary modules.
    // OFFICE_REENTRY_BOUNDARY_SPLIT adds six permanent Office reentry boundary modules.
    // DIRECTOR_LIFECYCLE_REALTIME_OWNER_SPLIT adds six permanent director lifecycle modules/tests.
    // LIST_RENDER_DISCIPLINE_HARDENING adds six permanent render discipline modules:
    //   reqIssueModal.row.model, ReqIssueModalRow, warehouseReports.row.model, ReportDocRowItem (4 source)
    //   + reqIssueModal.row.model.test, warehouseReports.row.model.test (2 tests).
    // CALCMODAL_OWNER_BOUNDARY_SPLIT adds five permanent owner-boundary modules:
    //   calcModal.normalize, calcModal.model, calcModal.validation, calcModal.state, CalcModalContent.
    // FOREMAN_SUBCONTRACT_CONTROLLER_OWNER_SPLIT adds four permanent controller-boundary modules:
    //   foreman.subcontractController.model, guards, effects, telemetry.
    // BUYER_SCREEN_OWNER_SPLIT adds four permanent buyer screen boundary files:
    //   buyer.screen.model, BuyerSearchBar, BuyerScreenContent, buyer.screen.model.test.
    // FOREMAN_DRAFT_RUNTIME_OWNER_SPLIT adds one permanent runtime owner hook:
    //   useForemanDraftBoundaryRuntimeSubscriptions.
    // V4-7B adds one permanent Foreman navigation-flow hook:
    //   useForemanNavigationFlow.
    // V4-7C adds one permanent Foreman FIO/bootstrap-flow hook:
    //   useForemanFioBootstrapFlow.
    // S-50K-ARCH-1/S-50K-CACHE-1/S-50K-JOBS-1/S-50K-IDEMPOTENCY-1/S-50K-RATE-1
    // add bounded contract-only scale scaffold files.
    expect(p3ATypeBoundaryFiles).toBeLessThanOrEqual(5);
    expect(v47BForemanNavigationFlowFiles).toBeLessThanOrEqual(1);
    expect(v47CForemanFioBootstrapFlowFiles).toBeLessThanOrEqual(1);
    expect(s50kBffBoundaryScaffoldFiles).toBeLessThanOrEqual(10);
    expect(
      tsFiles -
        p3ATypeBoundaryFiles -
        v47BForemanNavigationFlowFiles -
        v47CForemanFioBootstrapFlowFiles -
        s50kBffBoundaryScaffoldFiles,
    ).toBeLessThanOrEqual(1300);
  });
});

function countFilesRecursive(dir: string, pattern: RegExp): number {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFilesRecursive(path.join(dir, entry.name), pattern);
    } else if (pattern.test(entry.name)) {
      count++;
    }
  }
  return count;
}
