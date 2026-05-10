import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("S_NIGHT_UI_14 AccountantScreen decomposition A", () => {
  const screenSource = read("src/screens/accountant/AccountantScreen.tsx");
  const compositionSource = read("src/screens/accountant/useAccountantScreenComposition.tsx");
  const viewSource = read("src/screens/accountant/components/AccountantScreenView.tsx");

  it("keeps AccountantScreen as a small composition shell", () => {
    const hookCalls = screenSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(screenSource).toContain("useAccountantScreenComposition");
    expect(screenSource).toContain("<AccountantScreenView");
    expect(hookCalls).toEqual(["useAccountantScreenComposition("]);
    expect(screenSource.split(/\r?\n/).length).toBeLessThanOrEqual(24);
    expect(screenSource).not.toContain("useAccountantScreenController");
    expect(screenSource).not.toContain("useAccountantInvoiceForm");
    expect(screenSource).not.toContain("RoleScreenLayout");
  });

  it("keeps orchestration in the typed composition hook and rendering in the view", () => {
    expect(compositionSource).toContain("export function useAccountantScreenComposition()");
    expect(compositionSource).toContain("export type AccountantScreenComposition");
    expect(viewSource).toContain("type { AccountantScreenComposition }");
    expect(viewSource).toContain("export function AccountantScreenView");

    expect(compositionSource).toContain("useAccountantScreenViewModel");
    expect(compositionSource).toContain("useAccountantInvoiceForm");
    expect(compositionSource).toContain("useAccountantScreenController");
    expect(compositionSource).toContain("useAccountantPayActions");
    expect(viewSource).toContain("<AccountantHeader");
    expect(viewSource).toContain("<AccountantListBlock");
    expect(viewSource).toContain("<CardModal");
    expect(viewSource).toContain("<ActivePaymentForm");
  });

  it("does not introduce transport, cache, or rate-limit work in the new view boundary", () => {
    for (const forbidden of ["supabase", "fetch(", "cache", "rateLimit", "listAccountantInbox"]) {
      expect(viewSource).not.toContain(forbidden);
    }

    expect(screenSource).not.toContain("supabase");
    expect(screenSource).not.toContain("fetch(");
  });
});
