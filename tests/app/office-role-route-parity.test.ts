import fs from "fs";
import path from "path";

const appTabsDir = path.join(__dirname, "../../app/(tabs)");
const srcScreensDir = path.join(__dirname, "../../src/screens");

const roleRoutes = [
  {
    role: "buyer",
    screenFile: "buyer/BuyerScreen.tsx",
    screenExport: "BuyerScreen",
  },
  {
    role: "accountant",
    screenFile: "accountant/AccountantScreen.tsx",
    screenExport: "AccountantScreen",
  },
  {
    role: "contractor",
    screenFile: "contractor/ContractorScreen.tsx",
    screenExport: "ContractorScreen",
  },
  {
    role: "director",
    screenFile: "director/DirectorScreen.tsx",
    screenExport: "DirectorScreen",
  },
  {
    role: "foreman",
    screenFile: "foreman/ForemanScreen.tsx",
    screenExport: "ForemanScreen",
  },
] as const;

const readText = (fullPath: string) => fs.readFileSync(fullPath, "utf8");

describe("office role route parity", () => {
  // NAV-LAZY: Tab-level role files were removed. Role screens now ONLY
  // exist under office/ child routes. This test ensures they stay removed.
  it.each(roleRoutes)(
    "ensures (tabs)/$role.tsx tab-level duplicate does NOT exist for $role",
    ({ role }) => {
      const tabFilePath = path.join(appTabsDir, `${role}.tsx`);
      expect(fs.existsSync(tabFilePath)).toBe(false);
    },
  );

  it.each(roleRoutes)(
    "keeps /office/$role as a thin audited wrapper around the same src screen",
    ({ role, screenFile, screenExport }) => {
      const officeSource = readText(path.join(appTabsDir, `office/${role}.tsx`));

      expect(officeSource).toContain(
        `import { ${screenExport} } from "../../../src/screens/${screenFile.replace(/\.tsx$/, "")}";`,
      );
      expect(officeSource).toContain("useOfficeChildRouteAudit({");
      expect(officeSource).toContain(`route: "/office/${role}"`);
      expect(officeSource).toContain(`wrappedRoute: "/${role}"`);
      expect(officeSource).not.toContain(`from "../${role}"`);
      expect(officeSource).not.toMatch(/\buse(State|Effect|Memo|Callback|Ref)\b/);
      expect(officeSource).not.toContain("supabase");
    },
  );
});

