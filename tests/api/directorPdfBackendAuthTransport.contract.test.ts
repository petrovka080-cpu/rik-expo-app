import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("director PDF backend auth transport boundary", () => {
  it("delegates auth refresh to the canonical PDF auth transport", () => {
    const invokerSource = read("src/lib/api/directorPdfBackendInvoker.ts");
    const transportSource = read("src/lib/api/canonicalPdfAuth.transport.ts");

    expect(invokerSource).toContain("./canonicalPdfAuth.transport");
    expect(invokerSource).toContain("refreshCanonicalPdfSessionOnce()");
    expect(invokerSource).not.toContain("supabase.auth.getSession");
    expect(invokerSource).not.toContain("supabase.auth.refreshSession");
    expect(invokerSource).not.toContain("catch {");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("supabase.auth.refreshSession");
  });

  it("keeps director backend invocation owned by the existing invoker", () => {
    const invokerSource = read("src/lib/api/directorPdfBackendInvoker.ts");

    expect(invokerSource).toContain("invokeDirectorPdfBackendOnce");
    expect(invokerSource).toContain("supabase.functions.invoke");
    expect(invokerSource).toContain("auth_failed");
    expect(invokerSource).toContain("DirectorPdfTransportError");
  });
});
