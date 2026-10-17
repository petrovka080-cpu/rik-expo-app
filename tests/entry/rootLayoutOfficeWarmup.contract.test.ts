import fs from "fs";
import path from "path";
import vm from "node:vm";
import ts from "typescript";
import { isPublicRequestRoutePathname } from "../../src/lib/navigation/coreRoutes";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

// Execute the actual pure policy without booting the root's auth/providers.
const source = read("app/_layout.tsx");
const parsed = ts.createSourceFile("_layout.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const policies = ["normalizeWarmupPathname", "shouldWarmOfficeRouteAfterStartup"].map((name) => {
  const declaration = parsed.statements.find((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
  if (!declaration) throw new Error(`Missing root startup policy: ${name}`);
  return ts.createPrinter().printNode(ts.EmitHint.Unspecified, declaration, parsed);
});
const compiled = ts.transpileModule(policies.join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const shouldWarmOffice = vm.runInNewContext(
  `${compiled}\nshouldWarmOfficeRouteAfterStartup`,
  { isPublicRequestRoutePathname },
) as (pathname: string | null | undefined, platformOs: string) => boolean;

const publicPaths = [
  null, undefined, "", "/", "/index", "/request", "/request/index",
  "/(tabs)/request", "/(tabs)/request/index",
  "/request?canonicalRevisionId=saved", "/auth", "/auth/login",
  "/auth/recovery", "/sign-in", "/pdf-viewer",
];

describe("RootLayout Office warmup startup contract", () => {
  it("retains native warmup and the registered Office route import", () => {
    const source = read("app/_layout.tsx");

    expect(source).toContain("shouldWarmOfficeRouteAfterStartup");
    expect(source).toContain('normalizedPathname === "/office"');
    expect(source).toContain('normalizedPathname.startsWith("/office/")');
    expect(source).toContain('void import("./(tabs)/office/index")');
    expect(source).toContain("InteractionManager.runAfterInteractions");
    expect(source).toContain('process.env.NODE_ENV === "test"');
  });

  it.each(publicPaths)("does not load the unrelated Office graph on public Web path %s", (pathname) => {
    expect(shouldWarmOffice(pathname, "web")).toBe(false);
  });

  it.each(publicPaths)("preserves native Office warmup on %s", (pathname) => {
    expect(shouldWarmOffice(pathname, "android")).toBe(true);
    expect(shouldWarmOffice(pathname, "ios")).toBe(true);
  });

  it.each(["/office", "/office/director", "/office?tab=director"])("does not preload an already active Office route %s", (pathname) => {
    for (const platformOs of ["web", "android", "ios"]) {
      expect(shouldWarmOffice(pathname, platformOs)).toBe(false);
    }
  });

  it.each(["/market", "/chat", "/profile", "/requester", "/authentic"])("loads Office only on demand after Web navigation to %s", (pathname) => {
    expect(shouldWarmOffice(pathname, "web")).toBe(false);
    expect(shouldWarmOffice(pathname, "android")).toBe(true);
    expect(shouldWarmOffice(pathname, "ios")).toBe(true);
  });

  it("supplies the real platform to the startup policy", () => {
    expect(source).toContain("shouldWarmOfficeRouteAfterStartup(pathname, Platform.OS)");
  });
});
