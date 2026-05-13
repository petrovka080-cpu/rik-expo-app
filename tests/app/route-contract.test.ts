/**
 * DEEP-LINK CONTRACT — Route contract test.
 *
 * Catalogs every route in app/ and verifies:
 * - All expected route files exist
 * - Re-export aliases point to valid targets
 * - coreRoutes constants reference real routes
 * - Known orphaned/legacy routes are explicitly documented
 * - No new undocumented routes appear without updating this contract
 */

import fs from "fs";
import path from "path";

const appDir = path.join(__dirname, "../../app");
const tabsDir = path.join(appDir, "(tabs)");

const readText = (filePath: string) => fs.readFileSync(filePath, "utf8");
const fileExists = (filePath: string) => fs.existsSync(filePath);

// --- ACTIVE routes that MUST exist ---

const ACTIVE_ROOT_ROUTES = [
  "_layout.tsx",
  "index.tsx",
  "pdf-viewer.tsx",
  "+not-found.tsx",
  "seller.tsx",
  "supplierShowcase.tsx",
] as const;

const ACTIVE_AUTH_ROUTES = [
  "auth/_layout.tsx",
  "auth/login.tsx",
  "auth/register.tsx",
  "auth/reset.tsx",
] as const;

const ACTIVE_FEATURE_ROUTES = [
  "ai-approval-inbox.tsx",
  "ai-command-center.tsx",
  "ai-procurement-copilot.tsx",
  "auction/[id].tsx",
  "product/[id].tsx",
  "reports/dashboard.tsx",
] as const;

const ACTIVE_VISIBLE_TABS = [
  "(tabs)/_layout.tsx",
  "(tabs)/market.tsx",
  "(tabs)/add.tsx",
  "(tabs)/chat.tsx",
  "(tabs)/profile.tsx",
] as const;

const ACTIVE_HIDDEN_TABS = [
  "(tabs)/ai.tsx",
  "(tabs)/supplierMap.tsx",
  "(tabs)/auctions.tsx",
] as const;

const ACTIVE_OFFICE_ROUTES = [
  "(tabs)/office/_layout.tsx",
  "(tabs)/office/index.tsx",
  "(tabs)/office/foreman.tsx",
  "(tabs)/office/director.tsx",
  "(tabs)/office/buyer.tsx",
  "(tabs)/office/accountant.tsx",
  "(tabs)/office/warehouse.tsx",
  "(tabs)/office/contractor.tsx",
  "(tabs)/office/reports.tsx",
  "(tabs)/office/security.tsx",
] as const;

// --- RE-EXPORT aliases ---

const RE_EXPORT_ALIASES = [
  { file: "chat/index.tsx", target: "(tabs)/chat" },
  { file: "reports/ai-assistant.tsx", target: "(tabs)/ai" },
] as const;

// --- LEGACY routes (documented, not removed for deep-link safety) ---

const LEGACY_ROUTES = [
  "sign-in.tsx",                  // Legacy redirect → /auth/login
  "(tabs)/suppliers-map.tsx",     // Legacy alias → supplierMap
] as const;

// --- ORPHANED routes (documented, kept for deep-link safety) ---

const ORPHANED_ROUTES = [
  "calculator/index.tsx",         // Orphaned stub, zero nav refs
  "(tabs)/request/[id].tsx",      // Orphaned detail screen, zero nav refs
] as const;

// --- NAV-LAZY: Deleted role tabs that must NOT reappear ---

const DELETED_ROLE_TABS = [
  "(tabs)/foreman.tsx",
  "(tabs)/director.tsx",
  "(tabs)/buyer.tsx",
  "(tabs)/accountant.tsx",
  "(tabs)/contractor.tsx",
  "(tabs)/security.tsx",
  "(tabs)/reports.tsx",
] as const;

describe("route contract", () => {
  describe("active routes exist", () => {
    const allActive = [
      ...ACTIVE_ROOT_ROUTES,
      ...ACTIVE_AUTH_ROUTES,
      ...ACTIVE_FEATURE_ROUTES,
      ...ACTIVE_VISIBLE_TABS,
      ...ACTIVE_HIDDEN_TABS,
      ...ACTIVE_OFFICE_ROUTES,
    ];

    it.each(allActive)("app/%s exists", (route) => {
      expect(fileExists(path.join(appDir, route))).toBe(true);
    });
  });

  describe("re-export aliases point to valid targets", () => {
    it.each(RE_EXPORT_ALIASES)(
      "app/$file re-exports from $target",
      ({ file, target }) => {
        const source = readText(path.join(appDir, file));
        expect(source).toContain(target);
        // Verify the target file actually exists
        const targetFile = path.join(appDir, `${target}.tsx`);
        expect(fileExists(targetFile)).toBe(true);
      },
    );
  });

  describe("legacy routes are documented", () => {
    it.each(LEGACY_ROUTES)("app/%s exists (legacy, kept for compat)", (route) => {
      expect(fileExists(path.join(appDir, route))).toBe(true);
    });

    it("sign-in.tsx redirects to /auth/login", () => {
      const source = readText(path.join(appDir, "sign-in.tsx"));
      expect(source).toContain("/auth/login");
      expect(source).toContain("Redirect");
    });

    it("suppliers-map.tsx re-exports from supplierMap", () => {
      const source = readText(path.join(tabsDir, "suppliers-map.tsx"));
      expect(source).toContain("supplierMap");
    });
  });

  describe("orphaned routes are documented", () => {
    it.each(ORPHANED_ROUTES)(
      "app/%s exists (orphaned, kept for deep-link safety)",
      (route) => {
        expect(fileExists(path.join(appDir, route))).toBe(true);
      },
    );
  });

  describe("NAV-LAZY: deleted role tabs stay deleted", () => {
    it.each(DELETED_ROLE_TABS)(
      "app/%s must NOT exist",
      (route) => {
        expect(fileExists(path.join(appDir, route))).toBe(false);
      },
    );
  });

  describe("coreRoutes constants match real routes", () => {
    it("keeps route constants aligned with existing files", () => {
      const coreRoutes = readText(
        path.join(__dirname, "../../src/lib/navigation/coreRoutes.ts"),
      );

      // These constants should reference routes that exist
      expect(coreRoutes).toContain('"/auth/login"');
      expect(coreRoutes).toContain('"/office/director"');
      expect(coreRoutes).toContain('"/(tabs)/add"');
      expect(coreRoutes).toContain('"/(tabs)/profile"');
      expect(coreRoutes).toContain('"/reports/dashboard"');
      expect(coreRoutes).toContain('"/reports/ai-assistant"');
      expect(coreRoutes).toContain('"/seller"');
      expect(coreRoutes).toContain('"/supplierMap"');
      expect(coreRoutes).toContain('"/supplierShowcase"');

      // Must NOT reference deleted routes
      expect(coreRoutes).not.toContain('= "/director"');
      expect(coreRoutes).not.toContain('= "/foreman"');
      expect(coreRoutes).not.toContain('= "/buyer"');
    });
  });

  describe("no undocumented route files", () => {
    it("all files in app/ are covered by this contract", () => {
      const allKnown = new Set([
        ...ACTIVE_ROOT_ROUTES,
        ...ACTIVE_AUTH_ROUTES,
        ...ACTIVE_FEATURE_ROUTES,
        ...ACTIVE_VISIBLE_TABS,
        ...ACTIVE_HIDDEN_TABS,
        ...ACTIVE_OFFICE_ROUTES,
        ...RE_EXPORT_ALIASES.map((a) => a.file),
        ...LEGACY_ROUTES,
        ...ORPHANED_ROUTES,
        // Non-route files
        "global.css",
        "calculator/_webStyleGuard.tsx",
      ]);

      const actualFiles: string[] = [];
      function walk(dir: string, prefix: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === "node_modules") continue;
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), rel);
          } else {
            actualFiles.push(rel);
          }
        }
      }
      walk(appDir, "");

      const undocumented = actualFiles.filter((f) => !allKnown.has(f));
      expect(undocumented).toEqual([]);
    });
  });
});
