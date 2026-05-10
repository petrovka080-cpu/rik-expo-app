import fs from "node:fs";
import path from "node:path";

import { buildSelectInventoryPayload } from "../../scripts/data/unboundedSelectInventory";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const wildcardSelectCall = /\.select\(\s*["'`]\*["'`]/;

describe("S_NIGHT_DATA_05_SELECT_STAR_PRODUCTION_CLOSEOUT", () => {
  it("keeps production runtime Supabase select-star calls closed", () => {
    const payload = buildSelectInventoryPayload({
      projectRoot: PROJECT_ROOT,
      wave: "S_NIGHT_DATA_05_SELECT_STAR_PRODUCTION_CLOSEOUT",
    });

    expect(payload.metrics.scannerScope).toContain("src/** and app/**");
    expect(payload.metrics.selectStarCount).toBe(0);
    expect(payload.inventory.filter((entry) => entry.selectStar)).toEqual([]);
  });

  it("keeps the replaced production wildcard reads on explicit source contracts", () => {
    const sources = [
      readProjectFile("src/lib/api/requests.read-capabilities.ts"),
      readProjectFile("src/lib/api/suppliers.ts"),
      readProjectFile("src/lib/assistant_store_read.low_risk.transport.ts"),
      readProjectFile("src/lib/catalog/catalog.request.transport.ts"),
      readProjectFile("src/lib/catalog/catalog.transport.supabase.ts"),
      readProjectFile("src/lib/chat_api.ts"),
      readProjectFile("src/lib/store_supabase.read.transport.ts"),
      readProjectFile("src/lib/store_supabase.write.transport.ts"),
      readProjectFile("src/screens/contractor/contractor.loadWorksService.ts"),
      readProjectFile("src/screens/contractor/contractor.profileService.ts"),
      readProjectFile("src/screens/contractor/contractor.workModalService.ts"),
      readProjectFile("src/screens/office/officeAccess.services.ts"),
      readProjectFile("src/screens/profile/profile.services.ts"),
    ];
    const combinedSource = sources.join("\n");

    expect(combinedSource).not.toMatch(wildcardSelectCall);
    expect(combinedSource).toContain("REQUESTS_READABLE_COLUMNS_PROBE_SELECT");
    expect(combinedSource).toContain("SUPPLIER_ROW_SELECT");
    expect(combinedSource).toContain("CHAT_MESSAGE_SELECT");
    expect(combinedSource).toContain("CATALOG_REQUEST_EXTENDED_META_PROBE_SELECT");
    expect(combinedSource).toContain("PROFILE_CONTRACTOR_COMPAT_SELECT");
    expect(combinedSource).toContain("PENDING_REQUEST_ITEM_SELECT");
    expect(combinedSource).toContain("APPROVED_REQUEST_ITEM_SELECT");
    expect(combinedSource).toContain("STORE_PURCHASE_SELECT");
    expect(combinedSource).toContain("WORKS_FACT_SELECT");
    expect(combinedSource).toContain("CONTRACTOR_PROFILE_SELECT");
    expect(combinedSource).toContain("ISSUE_REQ_ITEM_UI_SELECT");
    expect(combinedSource).toContain("OFFICE_COMPANY_SELECT");
    expect(combinedSource).toContain("PROFILE_USER_SELECT");
  });
});
