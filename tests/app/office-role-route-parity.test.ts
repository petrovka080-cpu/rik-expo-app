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
  it.each(roleRoutes)(
    "keeps $role tab route thin and moves screen logic to src",
    ({ role, screenFile, screenExport }) => {
      const routeSource = readText(path.join(appTabsDir, `${role}.tsx`));
      const screenSource = readText(path.join(srcScreensDir, screenFile));

      expect(routeSource).toContain(
        `import { ${screenExport} } from "../../src/screens/${screenFile.replace(/\.tsx$/, "")}";`,
      );
      expect(routeSource).toContain("withScreenErrorBoundary");
      expect(routeSource).toContain(`route: "/${role}"`);
      expect(routeSource).not.toMatch(/\buse(State|Effect|Memo|Callback|Ref)\b/);
      expect(routeSource).not.toContain("supabase");
      expect(routeSource).not.toContain("RoleScreenLayout");
      expect(screenSource).toContain(`export function ${screenExport}()`);
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
