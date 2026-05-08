import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("contractor work search transport boundary", () => {
  it("keeps catalog_search behind the typed transport boundary", () => {
    const controllerSource = read("src/screens/contractor/contractor.workSearchController.ts");
    const transportSource = read("src/screens/contractor/contractor.workSearch.transport.ts");

    expect(controllerSource).toContain('from "./contractor.workSearch.transport"');
    expect(controllerSource).toContain("callContractorCatalogSearchRpc");
    expect(controllerSource).not.toContain('supabaseClient.rpc("catalog_search"');
    expect(controllerSource).not.toContain('.rpc("catalog_search"');
    expect(controllerSource).toContain("if (error)");
    expect(controllerSource).toContain("Array.isArray(data)");
    expect(controllerSource).toContain("mapCatalogSearchToWorkMaterials");
    expect(controllerSource).toContain("[material_search/catalog_search] error:");
    expect(controllerSource).toContain("[material_search/catalog_search] exception:");

    expect(transportSource).toContain('PublicFunctionArgs<"catalog_search">');
    expect(transportSource).toContain('supabaseClient.rpc("catalog_search"');
    expect(transportSource).not.toContain("mapCatalogSearchToWorkMaterials");
    expect(transportSource).not.toContain("Array.isArray(data)");
    expect(transportSource).not.toContain("console.warn");
  });
});
