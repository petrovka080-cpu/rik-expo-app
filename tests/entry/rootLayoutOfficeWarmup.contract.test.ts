import fs from "fs";
import path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("RootLayout Office warmup startup contract", () => {
  it("preloads the office route module after startup without running on office routes", () => {
    const source = read("app/_layout.tsx");

    expect(source).toContain("shouldWarmOfficeRouteAfterStartup");
    expect(source).toContain('normalizedPathname === "/office"');
    expect(source).toContain('normalizedPathname.startsWith("/office/")');
    expect(source).toContain('void import("./(tabs)/office/index")');
    expect(source).toContain('Platform.OS === "web"');
    expect(source).toContain("setTimeout(warmOfficeRoute, 0)");
    expect(source).toContain("InteractionManager.runAfterInteractions");
    expect(source).toContain('process.env.NODE_ENV === "test"');
  });
});
