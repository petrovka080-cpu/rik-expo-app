import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office role screens instant open contract", () => {
  it("keeps director initial content bounded and non-blocking", () => {
    const data = read("src/screens/director/director.data.ts");
    const lifecycle = read("src/screens/director/director.lifecycle.ts");
    const repository = read("src/screens/director/director.repository.ts");
    const smoke = read("scripts/e2e/runOfficeInstantOpenSmoke.ts");

    expect(repository).toContain("DIRECTOR_INITIAL_REQUEST_LIMIT = 12");
    expect(repository).toContain("DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT = 96");
    expect(repository).toContain('"director_pending_rows_initial_window"');
    expect(repository).toContain('opts.mode === "initial_window"');
    const fetchStart = repository.indexOf("export async function fetchDirectorPendingRows");
    const fetchBody = repository.slice(fetchStart);
    expect(fetchBody.indexOf('opts.mode === "initial_window"')).toBeLessThan(
      fetchBody.indexOf("callListDirectorItemsStableRpc"),
    );
    expect(repository).toContain("director.repository.requests_initial_window");
    expect(repository).toContain("director.repository.request_items_initial_window");
    expect(data).toContain('mode: "initial_window"');
    expect(data).toContain("requestLimit: DIRECTOR_INITIAL_REQUEST_LIMIT");
    expect(data).toContain("positionPreviewLimit: DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT");
    expect(data).toContain("void Promise.all([preloadDisplayNos(ids), preloadRequestMeta(ids)])");
    expect(data).not.toContain("await Promise.all([preloadDisplayNos(ids), preloadRequestMeta(ids)])");
    expect(data).toContain("hydrateRowsFullInBackground");
    expect(data).toContain('{ mode: "full" }');
    expect(data).not.toContain("await hydrateRowsFullInBackground()");
    expect(lifecycle).toContain("const prevFocusedRef = useRef(isScreenFocused)");
    expect(lifecycle).toContain("trustedRouteRuntimeReady || (await ensureSignedIn())");
    expect(smoke).toContain("DIRECTOR_USABLE_BUDGET_MS = 1_000");
    expect(smoke).toContain("ROLE_SHELL_BUDGET_MS = 500");
  });
});
