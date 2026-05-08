import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("director repository transport boundary", () => {
  it("keeps list_director_items_stable behind the typed transport boundary", () => {
    const repositorySource = read("src/screens/director/director.repository.ts");
    const transportSource = read("src/screens/director/director.repository.transport.ts");

    expect(repositorySource).toContain('from "./director.repository.transport"');
    expect(repositorySource).toContain("callListDirectorItemsStableRpc");
    expect(repositorySource).not.toContain('deps.supabase.rpc("list_director_items_stable"');
    expect(repositorySource).not.toContain('.rpc("list_director_items_stable"');
    expect(repositorySource).toContain("normalizeDirectorPendingRows");
    expect(repositorySource).toContain("loadDirectorRowsFallback");
    expect(repositorySource).toContain("list_director_items_stable_fallback");
    expect(repositorySource).toContain('warnDirectorRepository("list_director_items_stable", error, "error")');

    expect(transportSource).toContain("DirectorSupabaseClient");
    expect(transportSource).toContain('supabase.rpc("list_director_items_stable"');
    expect(transportSource).not.toContain("normalizeDirectorPendingRows");
    expect(transportSource).not.toContain("loadDirectorRowsFallback");
    expect(transportSource).not.toContain("warnDirectorRepository");
  });
});
