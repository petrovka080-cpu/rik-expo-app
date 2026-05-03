import fs from "node:fs";
import path from "node:path";

describe("RootLayout PDF warmup startup contract", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "_layout.tsx"), "utf8");

  it("does not warm the heavy PDF viewer during public auth startup", () => {
    expect(source).toContain("function shouldWarmPdfViewerAfterStartup");
    expect(source).toContain('input.authSessionStatus !== "authenticated"');
    expect(source).toContain('pathname === "/auth"');
    expect(source).toContain('pathname.startsWith("/auth/")');
  });

  it("keeps warmup off root/pdf routes and delayed after interactions", () => {
    expect(source).toContain('pathname === "/"');
    expect(source).toContain('pathname === "/pdf-viewer"');
    expect(source).toContain("InteractionManager.runAfterInteractions");
    expect(source).toContain("setTimeout(() =>");
  });
});
