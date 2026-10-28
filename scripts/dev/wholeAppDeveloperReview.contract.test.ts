import { readFileSync, readSync, openSync, closeSync, writeFileSync, statSync, mkdtempSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = (relative: string) => readFileSync(resolve(relative), "utf8");

describe("whole-app developer review runtime", () => {
  it("keeps the backend preload fail-closed for invalid parent, missing IPC and bounded parent lifetime", async () => {
    const ast = ts.createSourceFile("preload.mjs", source("scripts/dev/waitForBackendStartupManagerExit.mjs"), ts.ScriptTarget.Latest, true);
    const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "waitForBackendStartupManagerExit");
    if (!declaration) throw new Error("ACTUAL_STARTUP_PRELOAD_REQUIRED");
    const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    let timeout = () => {};
    let disconnected = () => {};
    const clear = jest.fn(), schedule = jest.fn((callback: () => void) => { timeout = callback; return 1; });
    const wait = runInNewContext(code + ";waitForBackendStartupManagerExit", { exports: {}, setTimeout: schedule, clearTimeout: clear });
    const runtime = () => ({ env: { LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID: "123" }, pid: 456, ppid: 123, send: () => {}, connected: true,
      once: jest.fn((_event: string, callback: () => void) => { disconnected = callback; }), removeListener: jest.fn() });
    for (const pid of ["0", "-1", "1.5", "456", "NaN", "789"]) expect(() => wait({ ...runtime(), env: { LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID: pid } })).toThrow("BACKEND_STARTUP_MANAGER_PID_INVALID");
    expect(() => wait({ ...runtime(), send: undefined })).toThrow("BACKEND_STARTUP_MANAGER_IPC_REQUIRED");
    await expect(wait({ ...runtime(), connected: false })).resolves.toBeUndefined();
    const active = runtime(), pending = wait(active);
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 5000);
    expect(active.env.LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID).toBeUndefined();
    disconnected(); await expect(pending).resolves.toBeUndefined(); expect(clear).toHaveBeenCalledWith(1);
    const stuck = runtime(), failure = wait(stuck); timeout();
    await expect(failure).rejects.toThrow("BACKEND_STARTUP_MANAGER_EXIT_TIMEOUT");
    expect(stuck.removeListener).toHaveBeenCalled();
  });
  it("the actual Node preload starts the child module only after the real launching manager has exited", async () => {
    const folder = mkdtempSync(resolve(tmpdir(), "gox-manager-exit-"));
    const marker = resolve(folder, "child-proof.json"), managerFile = resolve(folder, "manager.cjs");
    const stdout = resolve(folder, "child.stdout"), stderr = resolve(folder, "child.stderr"), parentProof = resolve(folder, "parent-proof.json");
    const preload = pathToFileURL(resolve("scripts/dev/waitForBackendStartupManagerExit.mjs")).href;
    const childCode = "const fs=require('node:fs');fs.writeFileSync(process.argv[1],JSON.stringify({managerDisconnected:!process.connected,parentTokenCleared:!process.env.LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID}));";
    writeFileSync(managerFile, "const fs=require('node:fs');const {spawn}=require('node:child_process');const out=fs.openSync(" + JSON.stringify(stdout) + ",'a'),err=fs.openSync(" + JSON.stringify(stderr) + ",'a');const child=spawn(process.execPath,['--import'," + JSON.stringify(preload) + ",'-e'," + JSON.stringify(childCode) + "," + JSON.stringify(marker) + "],{env:{...process.env,LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID:String(process.pid)},windowsHide:true,stdio:['ignore',out,err,'ipc']});child.unref();child.channel.unref();fs.closeSync(out);fs.closeSync(err);setTimeout(()=>fs.writeFileSync(" + JSON.stringify(parentProof) + ",JSON.stringify({childStartedWhileManagerAlive:fs.existsSync(" + JSON.stringify(marker) + ")})),300);\n");
    try {
      const manager = spawnSync(process.execPath, [managerFile], { cwd: resolve("."), windowsHide: true, encoding: "utf8" });
      expect({ status: manager.status, stderr: manager.stderr }).toEqual({ status: 0, stderr: "" });
      const deadline = Date.now() + 3000;
      while (!existsSync(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      expect(readFileSync(stderr, "utf8")).toBe("");
      expect(JSON.parse(readFileSync(parentProof, "utf8"))).toEqual({ childStartedWhileManagerAlive: false });
      expect(JSON.parse(readFileSync(marker, "utf8"))).toEqual({ managerDisconnected: true, parentTokenCleared: true });
    } finally {
      for (const file of [marker, managerFile, stdout, stderr, parentProof]) if (existsSync(file)) unlinkSync(file);
      rmdirSync(folder);
    }
  });
  it("defers the real PDF dependency until needed and preserves one shared browser, reconnect and failed-start recovery", async () => {
    const ast = ts.createSourceFile("backend.ts", source("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"), ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(statement => ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === "playwright");
    expect(imports).toHaveLength(1);
    expect((imports[0] as ts.ImportDeclaration).importClause?.isTypeOnly).toBe(true);
    const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "artifactBrowser");
    if (!declaration) throw new Error("ACTUAL_PDF_BROWSER_FUNCTION_REQUIRED");
    const code = ts.transpileModule("let artifactBrowserPromise=null;let artifactBrowserInstance=null;\n" + declaration.getText(ast),
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    let connected = true;
    let disconnect = () => {};
    const browser = { isConnected: () => connected, once: jest.fn((_event: string, callback: () => void) => { disconnect = callback; }) };
    let finishLaunch: (instance: typeof browser) => void = () => {};
    let notifyLaunch: () => void = () => {};
    const launchEntered = new Promise<void>(resolve => { notifyLaunch = resolve; });
    const launch = jest.fn(() => { notifyLaunch(); return new Promise<typeof browser>(resolve => { finishLaunch = resolve; }); });
    const requirePdf = jest.fn((name: string) => { expect(name).toBe("playwright"); return { chromium: { launch } }; });
    const getBrowser = runInNewContext(code + ";artifactBrowser", { require: requirePdf });
    expect(requirePdf).not.toHaveBeenCalled();
    const first = getBrowser(), second = getBrowser();
    await launchEntered;
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({ headless: true });
    finishLaunch(browser);
    expect(await first).toBe(browser); expect(await second).toBe(browser);
    expect(await getBrowser()).toBe(browser); expect(launch).toHaveBeenCalledTimes(1);
    connected = false; disconnect();
    launch.mockImplementationOnce(() => Promise.reject(new Error("PDF_START_FAILED")));
    await expect(getBrowser()).rejects.toThrow("PDF_START_FAILED");
    connected = true;
    launch.mockImplementationOnce(() => Promise.resolve(browser));
    expect(await getBrowser()).toBe(browser);
    expect(launch).toHaveBeenCalledTimes(3);
  });
  it("releases the startup manager without claiming READY and preserves full verification for synchronous starts and reused backends", async () => {
    const ast = ts.createSourceFile("manager.ts", source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts"), ts.ScriptTarget.Latest, true);
    const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "verifyBackendRuntimeStart");
    if (!declaration) throw new Error("ACTUAL_START_HANDOFF_FUNCTION_REQUIRED");
    const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const waitForPort = jest.fn(async () => true);
    const runtimeIdentity = jest.fn(async () => ({ processId: 123 }));
    const runtimeIdentityMatches = jest.fn(() => true);
    const invariant = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
    const verify = runInNewContext(code + ";verifyBackendRuntimeStart", { waitForPort, runtimeIdentity, runtimeIdentityMatches, invariant });
    expect(await verify({}, 123, true, true)).toBe(false);
    expect(waitForPort).not.toHaveBeenCalled();
    expect(runtimeIdentity).not.toHaveBeenCalled();
    expect(await verify({}, 123, true, false)).toBe(true);
    expect(waitForPort).toHaveBeenCalledWith(true, 25000);
    waitForPort.mockClear();
    expect(await verify({}, 123, false, true)).toBe(true);
    expect(waitForPort).not.toHaveBeenCalled();
    runtimeIdentityMatches.mockReturnValueOnce(false);
    await expect(verify({}, 123, false, true)).rejects.toThrow("R568_RUNTIME_IDENTITY_TUPLE_RED");
    await expect(verify({}, 456, false, true)).rejects.toThrow("R568_RUNTIME_IDENTITY_PID_RED");
    waitForPort.mockResolvedValueOnce(false);
    await expect(verify({}, 123, true, false)).rejects.toThrow("R568_BACKEND_START_TIMEOUT_PID_123");
  });
  it("the actual launcher refuses wrong source, release, runtime bytes, provider and process before upgrading pending identity", () => {
    const launcher = resolve("scripts/dev/startWholeAppDeveloperReview.ps1").replaceAll("'", "''");
    const command = [
      "$ErrorActionPreference='Stop';Set-StrictMode -Version Latest;$tokens=$null;$parseErrors=$null",
      "$ast=[System.Management.Automation.Language.Parser]::ParseFile('" + launcher + "',[ref]$tokens,[ref]$parseErrors);if($parseErrors.Count){throw 'LAUNCHER_PARSE_FAILED'}",
      "$function=@($ast.FindAll({param($node)$node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-WholeAppBackendRuntimeIdentity'},$true));if($function.Count -ne 1){throw 'ACTUAL_IDENTITY_BARRIER_REQUIRED'};. ([ScriptBlock]::Create($function[0].Extent.Text))",
      "$Root=(Get-Location).Path;$BuildCommit='commit';$Identity=[pscustomobject]@{sourceTreeHash='source';productSourceHash='product';jsBundleFingerprint='bundle'}",
      "$good=[pscustomobject]@{schemaVersion='rik-expo-app.local-runtime-identity.v1';runtimeRole='FULL_CANONICAL_ESTIMATE_BACKEND';processId=123;workingDirectory=$Root;sourceHead='commit';sourceTree='source';specSha256='master';runtimeSourceSha256='runtime';definitionReleaseId='release';searchReleaseId='search';authProviderUrlSha256='provider';authPublicKeySha256='public';frontendBuildIdentity=[pscustomobject]@{sourceTreeHash='source';productSourceHash='product';jsBundleFingerprint='bundle';buildCommit='commit'};containsCredentials=$false;containsTenantIdentity=$false}",
      "$backend=[pscustomobject]@{master_sha256='master';backend_pid=123;backend_runtime_source_sha256='runtime';auth_provider_url_sha256='provider';auth_public_key_sha256='public';definition_release_id='release';search_release_id='search';runtime_identity_verified=$false}",
      "$script:response=$good;$script:requests=0;$script:transient=$true",
      "function Invoke-RestMethod {param($Uri,$TimeoutSec)$script:requests++;if($script:transient){$script:transient=$false;throw 'NOT_LISTENING_YET'};$script:response}",
      "function Get-Process {param($Id,$ErrorAction)[pscustomobject]@{Id=$Id}};function Start-Sleep {param($Milliseconds)};function Fail-Review {param($Code,$Recovery)throw $Code}",
      "Assert-WholeAppBackendRuntimeIdentity -BackendManager $backend -WaitForStartup;$positive=$backend.runtime_identity_verified -and $script:requests -eq 2",
      "$results=@(foreach($field in @('sourceTree','definitionReleaseId','runtimeSourceSha256','authProviderUrlSha256','authPublicKeySha256','processId')){$script:response=$good|ConvertTo-Json -Depth 4|ConvertFrom-Json;if($field -eq 'processId'){$script:response.$field=456}else{$script:response.$field='wrong'};$backend.runtime_identity_verified=$false;$refused=$false;try{Assert-WholeAppBackendRuntimeIdentity -BackendManager $backend -WaitForStartup}catch{$refused=$_.Exception.Message -eq 'CANONICAL_ESTIMATE_RUNTIME_IDENTITY_RED'};[pscustomobject]@{field=$field;refused=$refused;stillPending=-not $backend.runtime_identity_verified}})",
      "[pscustomobject]@{positive=$positive;negativeCases=$results}|ConvertTo-Json -Depth 4 -Compress",
    ].join("\n");
    const result = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", command], { cwd: resolve("."), windowsHide: true, encoding: "utf8" });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    const outcome = JSON.parse(result.stdout);
    expect(outcome.positive).toBe(true);
    expect(outcome.negativeCases).toHaveLength(6);
    expect(outcome.negativeCases.every((entry: { refused: boolean; stillPending: boolean }) => entry.refused && entry.stillPending)).toBe(true);
  });
  it("streams the exact existing closure hash across imports, cycles, UTF-8 and multiple read blocks", () => {
    const ast = ts.createSourceFile("manager.ts", source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts"), ts.ScriptTarget.Latest, true);
    const declarations = ast.statements.filter(statement => ts.isFunctionDeclaration(statement)
      && ["resolveLocalImport", "backendRuntimeClosureSha256"].includes(statement.name?.text ?? ""));
    expect(declarations).toHaveLength(2);
    const code = ts.transpileModule(declarations.map(statement => statement.getText(ast)).join("\n"),
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const folder = mkdtempSync(resolve(tmpdir(), "gox-closure-stream-"));
    const files = [resolve(folder, "entry.ts"), resolve(folder, "child.ts"), resolve(folder, "data.json")];
    try {
      writeFileSync(files[0], "import './child';\nimport data from './data.json';\n// Окраска\n");
      writeFileSync(files[1], "export * from './entry';\n// Цикл сохраняет одного владельца\n");
      writeFileSync(files[2], JSON.stringify({ text: "Ресурс и оснастка — ".repeat(12000) }));
      const expected = createHash("sha256");
      for (const path of [...files].sort()) expected.update(relative(process.cwd(), path).replaceAll("\\", "/"))
        .update("\0").update(readFileSync(path)).update("\0");
      const reads = jest.fn(readSync);
      const hashClosure = runInNewContext(code + ";backendRuntimeClosureSha256", {
        readFileSync, readSync: reads, openSync, closeSync, existsSync, statSync,
        resolve, dirname, relative, createHash, Buffer, process,
      });
      expect(hashClosure(files[0])).toBe(expected.digest("hex"));
      expect(reads.mock.calls.length).toBeGreaterThan(6);
      expect(reads.mock.calls.every(call => call[3] <= 64 * 1024)).toBe(true);
    } finally { for (const path of files) unlinkSync(path); rmdirSync(folder); }
  });
  it("inspects the actual listener owner only for an open port and keeps owner inspection errors fail-closed", async () => {
    const manager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");
    const ast = ts.createSourceFile("manager.ts", manager, ts.ScriptTarget.Latest, true);
    const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "portOwner");
    if (!declaration) throw new Error("ACTUAL_PORT_OWNER_FUNCTION_REQUIRED");
    const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const execFileSync = jest.fn(() => JSON.stringify({ pid: 123, name: "node.exe", commandLine: "serveCanonicalEstimateLocalR1.ts" }));
    let open = false;
    const readOwner = runInNewContext(code + ";portOwner", { portOpen: async () => open, execFileSync, BACKEND_PORT: 8765 });
    expect(await readOwner()).toBeNull();
    expect(execFileSync).not.toHaveBeenCalled();
    open = true;
    expect(await readOwner()).toMatchObject({ pid: 123, name: "node.exe" });
    expect(execFileSync).toHaveBeenCalledTimes(1);
    execFileSync.mockImplementationOnce(() => { throw new Error("CIM_FAILED"); });
    await expect(readOwner()).rejects.toThrow("CIM_FAILED");
    expect(manager).toContain("const ownerBefore = await portOwner()");
    expect(manager).toContain('invariant(runtimeIdentityMatches(identity, desired), "R568_RUNTIME_IDENTITY_TUPLE_RED")');
  });
  it.each(["powershell", "pwsh"])("frontend build stamp persists one real timestamp per exact tuple and refuses a modified record (%s)", (shell) => {
    const folder = mkdtempSync(resolve(tmpdir(), "gox-build-stamp-"));
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
    try {
      const command = [
        "$ErrorActionPreference='Stop'; $tokens=$null; $parseErrors=$null",
        "$ast=[System.Management.Automation.Language.Parser]::ParseFile(" + quote(resolve("scripts/dev/startWholeAppDeveloperReview.ps1")) + ",[ref]$tokens,[ref]$parseErrors)",
        "if($parseErrors.Count){throw 'LAUNCHER_PARSE_FAILED'}",
        "foreach($name in @('Get-Sha256','Resolve-WholeAppFrontendBuildStamp')){$function=@($ast.FindAll({param($node)$node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true));if($function.Count -ne 1){throw 'UNIQUE_FUNCTION_REQUIRED'};. ([ScriptBlock]::Create($function[0].Extent.Text))}",
        "$identity=[pscustomobject]@{sourceTreeHash=('a'*64);productSourceHash=('b'*64);jsBundleFingerprint=('c'*64)}",
        "$backend=[pscustomobject]@{master_sha256=('d'*64);definition_release_id='release';search_release_id='search';capability_id='capability'}",
        "$folder=" + quote(folder),
        "$first=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$second=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$identity.jsBundleFingerprint=('e'*64);$changed=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$files=@(Get-ChildItem -LiteralPath (Join-Path $folder 'frontend-build-stamps') -File)",
        "$firstPath=Join-Path (Join-Path $folder 'frontend-build-stamps') ($first.tuple_sha256+'.json')",
        "$tampered=Get-Content -LiteralPath $firstPath -Raw | ConvertFrom-Json;$tampered.tuple.source_tree_hash=('f'*64);$tampered | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $firstPath -Encoding UTF8",
        "$identity.jsBundleFingerprint=('c'*64);$refused=$false;try{Resolve-WholeAppFrontendBuildStamp $folder $identity $backend | Out-Null}catch{$refused=$_.Exception.Message -eq 'WHOLE_APP_FRONTEND_BUILD_STAMP_TUPLE_DRIFT'}",
        "[pscustomobject]@{sameTuple=$first.tuple_sha256 -eq $second.tuple_sha256;sameTime=$first.build_time -eq $second.build_time;changedTuple=$first.tuple_sha256 -ne $changed.tuple_sha256;records=$files.Count;tamperRefused=$refused} | ConvertTo-Json -Compress",
      ].join("\n");
      const result = spawnSync(shell, ["-NoProfile", "-NonInteractive", "-Command", command], {
        cwd: resolve("."), windowsHide: true, encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ sameTuple: true, sameTime: true, changedTuple: true, records: 2, tamperRefused: true });
    } finally {
      const stamps = resolve(folder, "frontend-build-stamps");
      if (existsSync(stamps)) {
        for (const file of readdirSync(stamps)) unlinkSync(resolve(stamps, file));
        rmdirSync(stamps);
      }
      rmdirSync(folder);
    }
  });
  it("Web startup keeps backend execution after bundle completion even with transform cache, and preserves combined/preflight/prepare modes", () => {
    const launcher = resolve("scripts/dev/startWholeAppDeveloperReview.ps1").replaceAll("'", "''");
    const command = [
      "$ErrorActionPreference='Stop';$tokens=$null;$parseErrors=$null",
      "$ast=[System.Management.Automation.Language.Parser]::ParseFile('" + launcher + "',[ref]$tokens,[ref]$parseErrors)",
      "if($parseErrors.Count){throw 'LAUNCHER_PARSE_FAILED'}",
      "$assignment=@($ast.FindAll({param($node)$node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -eq '$DeferBackendForColdBundle'},$true));if($assignment.Count -ne 1){throw 'UNIQUE_ASSIGNMENT_REQUIRED'}",
      "function Get-NetTCPConnection {param($LocalPort,$State,$ErrorAction)if($portOpen){[pscustomobject]@{OwningProcess=1}}}",
      "$cases=@(@{target='Combined';cache=$false;preflight=$false;prepare=$false;open=$false},@{target='Combined';cache=$true;preflight=$false;prepare=$false;open=$false},@{target='Web';cache=$true;preflight=$false;prepare=$false;open=$false},@{target='Web';cache=$true;preflight=$true;prepare=$false;open=$false},@{target='Web';cache=$true;preflight=$false;prepare=$true;open=$false},@{target='Web';cache=$true;preflight=$false;prepare=$false;open=$true})",
      "$result=@(foreach($case in $cases){$WarmupTarget=$case.target;$ReuseTransformCache=$case.cache;$PreflightOnly=$case.preflight;$PrepareBuildOnly=$case.prepare;$portOpen=$case.open;& ([ScriptBlock]::Create($assignment[0].Right.Extent.Text))});ConvertTo-Json -InputObject $result -Compress",
    ].join("\n");
    const result = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", command], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([true, false, true, false, false, false]);
  });
  it("direct TypeScript loader executes the real manager's early mode guard without database effects", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx",
      "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts", "--prepare-only", "--preflight"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("R568_MANAGER_MODE_CONFLICT");
    expect(result.stdout).toBe("");
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    const managerCalls = launcher.split(/\r?\n/u).filter(line =>
      line.includes('$BackendManagerRaw = & $Node') && line.includes('ensureLocalDeveloperCanonicalBackend.ts'));
    expect(managerCalls).toHaveLength(2);
    const managerLoaders = managerCalls.map(line => {
      const loader = line.match(/& \$Node (.+?) \(Join-Path/u)?.[1];
      expect(loader).toBeDefined();
      return loader!.trim().split(/\s+/u);
    });
    expect(managerLoaders).toEqual([["--import", "tsx"], ["--import", "tsx"]]);
    expect(launcher).not.toContain("--experimental-strip-types");
    expect(launcher).not.toContain("$TsxCli");
    const handoffGuard = spawnSync(process.execPath, [...managerLoaders[1]!, "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts", "--return-after-start"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8", env: { ...process.env, LOCAL_DEVELOPER_BACKEND_AUTH_PROFILE: "local_provider" },
    });
    expect(handoffGuard.status).not.toBe(0);
    expect(handoffGuard.stderr).toContain("R568_MANAGER_START_HANDOFF_MODE_CONFLICT");
    expect(handoffGuard.stdout).toBe("");
    const managerGuard = spawnSync(process.execPath, [...managerLoaders[0]!, "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts", "--prepare-only", "--preflight"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(managerGuard.status).not.toBe(0);
    expect(managerGuard.stderr).toContain("R568_MANAGER_MODE_CONFLICT");
    expect(managerGuard.stdout).toBe("");
  });
  it("direct TypeScript loader returns the existing real build identity", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/dev/printLocalDeveloperBuildIdentity.ts"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.error).toBeUndefined();
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    const identity = JSON.parse(result.stdout);
    for (const field of ["sourceTreeHash", "productSourceHash", "jsBundleFingerprint"]) {
      expect(identity[field]).toMatch(/^[0-9a-f]{64}$/u);
    }
  });
  it("keeps the default review command on the complete staging role/data plane", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      scripts: Record<string, string>;
    };
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");

    expect(packageJson.scripts["dev:local-review"]).toContain(
      "scripts/dev/startWholeAppDeveloperReview.ps1",
    );
    expect(packageJson.scripts["dev:estimate-proof-review"]).toContain(
      "scripts/dev/startLocalDeveloperReview.ps1",
    );
    expect(launcher).toContain('Get-ConfiguredValue "STAGING_SUPABASE_URL"');
    expect(launcher).toContain('Get-ConfiguredValue "STAGING_SUPABASE_READONLY_KEY"');
    expect(launcher).toContain("whole_app_staging_plus_local_estimate");
    expect(launcher).toContain(
      '$ExpectedCanonicalRoot = [System.IO.Path]::GetFullPath("C:\\dev\\rik-expo-app-r4a5-dc4f0ce7")',
    );
    expect(launcher).toContain("$GitRootExitCode = $LASTEXITCODE");
    expect(launcher).toContain("[string]::IsNullOrWhiteSpace($GitRoot)");
    expect(launcher).toContain("[System.StringComparison]::OrdinalIgnoreCase");
    expect(launcher).toContain("Set-Location -LiteralPath $Root");
    expect(launcher).toContain("$CanonicalStandaloneDatabaseRoot");
    expect(launcher).toContain("$ProviderConfigAvailable");
    expect(launcher).toContain("-and -not $UseStandaloneLocalEstimateDatabase");
    expect(launcher).toContain("canonical_root = $Root");
    expect(launcher).toContain("git_root = [System.IO.Path]::GetFullPath($GitRoot)");
    expect(launcher).toContain("/rest/v1/rik_items?select=rik_code&limit=1");
    expect(launcher).toContain("/rest/v1/suppliers?select=id&limit=1");
    expect(launcher).toContain("/rest/v1/subcontracts?select=id&limit=1");
    expect(launcher).toContain("ensureLocalDeveloperCanonicalBackend.ts");
    expect(launcher).toContain('http://127.0.0.1:8765/runtime-identity');
    expect(launcher).toContain("CANONICAL_ESTIMATE_RUNTIME_IDENTITY_RED");
    expect(launcher).toContain("estimate_backend_runtime_identity_verified");
    expect(launcher).toContain('$env:LOCAL_DEVELOPER_BACKEND_AUTH_PROFILE = "whole_app_staging"');
    expect(launcher).toContain(
      "$env:LOCAL_DEVELOPER_BACKEND_AUTH_URL = $WholeAppUrl.TrimEnd('/')",
    );
    expect(launcher).toContain("LOCAL_DEVELOPER_BACKEND_AUTH_PUBLIC_KEY");
    expect(launcher).toContain(
      '$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = Resolve-WholeAppCanonicalFunctionUrl -Target $EmbeddedBuildTarget',
    );
    expect(launcher).toContain('$env:EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED = "false"');
    expect(launcher).toContain("whole-app-developer-current");
    expect(launcher).toContain("packager-status:running");
    expect(launcher).toContain("warmWholeAppDeveloperRuntime.cjs");
    expect(launcher).toContain('[string]$WarmupTarget = "Combined"');
    expect(launcher).toContain('WHOLE_APP_PLATFORM_READINESS_SCOPE_RED');
    expect(launcher).toContain('WHOLE_APP_WEB_PDF_TRANSPORT_READY_ANDROID_NOT_CHECKED');
    expect(launcher).toContain('android_transport_ready = [bool]$WarmupReceipt.androidTransportReady');
    expect(launcher.indexOf('WHOLE_APP_ANDROID_PDF_START_RED')).toBeLessThan(launcher.indexOf('schema_version = "rik-expo-app.whole-app-developer-runtime.v1"'));
    expect(launcher).toContain("[System.Text.Encoding]::UTF8.GetString($status.Content)");
    expect(launcher).not.toMatch(/Write-Host[^\n]*(WholeAppKey|ANON_KEY|READONLY_KEY)/u);
  });

  it("rejects privileged browser credentials and records only fingerprints", () => {
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    const backendManager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");

    expect(launcher).toContain('WholeAppKey -match "service[_-]?role|sb_secret|private[_-]?key"');
    expect(launcher).toContain('Remove-Item -LiteralPath "Env:\\$name"');
    expect(launcher).toContain("provider_url_fingerprint");
    expect(launcher).toContain("provider_public_fingerprint");
    expect(launcher).toContain("estimate_backend_authenticated_probe_pending");
    expect(launcher).not.toContain("provider_public_key =");
    expect(launcher).not.toContain("whole_app_key =");
    expect(backendManager).toContain('"local_provider" | "whole_app_staging"');
    expect(backendManager).toContain("SIGNED_CLAIMS_OR_COMPANY_MEMBERSHIP");
    expect(backendManager).toContain("CANONICAL_ESTIMATE_ALLOW_RUNTIME_TENANT_CAPABILITY_DERIVATION");
    expect(backendManager).toContain(
      "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
    );
    expect(backendManager).toContain("authenticated_runtime_manifest_verified");
    expect(backendManager).toContain("runtimeIdentityMatches");
    expect(backendManager).toContain("authProviderUrlSha256");
    expect(backendManager).toContain("authPublicKeySha256");
    expect(backendManager).toContain("R568_RUNTIME_IDENTITY_TUPLE_RED");
    const backend = source(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(backend).toContain("authProviderUrlSha256: SUPABASE_AUTH_URL_SHA256");
    expect(backend).toContain("authPublicKeySha256: SUPABASE_AUTH_API_KEY_SHA256");
    expect(backend).not.toContain("authProviderUrl: SUPABASE_AUTH_URL");
    expect(backend).not.toContain("authPublicKey: SUPABASE_AUTH_API_KEY");
  });

  it("binds an explicitly selected MASTER file and rejects reuse on specification drift without reading auth", () => {
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    const manager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");
    const backend = source("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    expect(launcher).toContain('[string]$MasterPath = ""');
    expect(launcher).toContain('Test-Path -LiteralPath $Path -PathType Leaf');
    expect(launcher).toContain('Get-FileHash -LiteralPath $Path -Algorithm SHA256');
    expect(launcher).toContain('Resolve-MasterSpecSha256 -Path $MasterPath');
    expect(launcher).toContain('$env:LOCAL_DEVELOPER_MASTER_SHA256 = $RequestedMasterSha256');
    expect(launcher).toContain('$RuntimeIdentity.specSha256 -eq [string]$BackendManager.master_sha256');
    const identityGuard = manager.slice(manager.indexOf("function runtimeIdentityMatches("), manager.indexOf("function manifestMatches("));
    expect(identityGuard).toContain('identity?.specSha256 === desired.masterSha256');
    expect(identityGuard).not.toContain("authenticatedManifest");
    const identityResponse = backend.slice(backend.indexOf('path[0] === "runtime-identity"'), backend.indexOf("if (!requestPrincipalStorage.getStore())"));
    expect(identityResponse).toContain("specSha256: R45_RUNTIME_SPEC_SHA256");
    expect(identityResponse).toContain("containsCredentials: false");
    expect(identityResponse).toContain("containsTenantIdentity: false");
    expect(launcher).toContain("master_sha256 = [string]$BackendManager.master_sha256");
    const managerStdout = manager.slice(manager.lastIndexOf("process.stdout.write("));
    expect(managerStdout).toContain("master_sha256: receipt.master_sha256");
  });
});
