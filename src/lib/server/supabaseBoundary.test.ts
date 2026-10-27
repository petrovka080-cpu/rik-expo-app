import fs from "node:fs";
import path from "node:path";

const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("supabase service role boundary", () => {
  it("keeps service role out of the shared client module", () => {
    const clientSource = readProjectFile("src/lib/supabaseClient.ts");

    expect(clientSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(clientSource).toContain('SUPABASE_KEY_KIND = "anon"');
    expect(clientSource).not.toContain('eval("require")');
    expect(clientSource).toContain('import "react-native-url-polyfill/auto";');
  });

  it("keeps service role inside the server-only env module", () => {
    const serverEnvSource = readProjectFile("src/lib/server/serverSupabaseEnv.ts");
    const queueWorkerSource = readProjectFile("src/workers/queueWorker.ts");
    const serverQueueWorkerSource = readProjectFile("src/workers/queueWorker.server.ts");

    expect(serverEnvSource).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(queueWorkerSource).not.toContain("../lib/server/serverSupabaseClient");
    expect(serverQueueWorkerSource).toContain("../lib/server/serverSupabaseClient");
  });
});
