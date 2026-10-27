const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const launcher = path.join(__dirname, 'startWholeAppDeveloperReview.ps1');
const quote = value => "'" + value.replaceAll("'", "''") + "'";

describe('embedded Android canonical backend transport', () => {
  it('executes the actual URL resolver and retains the host default without starting the launcher', () => {
    const command = [
      "$ErrorActionPreference = 'Stop'",
      '$tokens = $null; $parseErrors = $null',
      '$ast = [System.Management.Automation.Language.Parser]::ParseFile(' + quote(launcher) + ', [ref]$tokens, [ref]$parseErrors)',
      "if ($parseErrors.Count -ne 0) { throw 'LAUNCHER_PARSE_FAILED' }",
      "$functions = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Resolve-WholeAppCanonicalFunctionUrl' }, $true))",
      "if ($functions.Count -ne 1) { throw 'URL_RESOLVER_NOT_UNIQUE' }",
      '. ([ScriptBlock]::Create($functions[0].Extent.Text))',
      "$target = @($ast.ParamBlock.Parameters | Where-Object { $_.Name.VariablePath.UserPath -eq 'EmbeddedBuildTarget' })",
      "if ($target.Count -ne 1) { throw 'TARGET_PARAMETER_NOT_UNIQUE' }",
      "$rejected = $false; try { Resolve-WholeAppCanonicalFunctionUrl -Target Other | Out-Null } catch { $rejected = $true }",
      "[PSCustomObject]@{ hostUrl = (Resolve-WholeAppCanonicalFunctionUrl -Target Host); androidUrl = (Resolve-WholeAppCanonicalFunctionUrl -Target AndroidEmulator); defaultTarget = [string]$target[0].DefaultValue.Value; unknownTargetRejected = $rejected } | ConvertTo-Json -Compress",
    ].join('\n');
    const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
      cwd: root, windowsHide: true, encoding: 'utf8',
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      hostUrl: 'http://127.0.0.1:8765', androidUrl: 'http://10.0.2.2:8765',
      defaultTarget: 'Host', unknownTargetRejected: true,
    });
    const networkPolicy = fs.readFileSync(path.join(root, 'android/app/src/main/res/xml/network_security_config.xml'), 'utf8');
    expect(networkPolicy).toContain('<base-config cleartextTrafficPermitted="false"');
    expect(networkPolicy).toContain('<domain includeSubdomains="false">10.0.2.2</domain>');
  });

  it.each([
    { mode: 'ordinary runtime', switches: [] },
    { mode: 'preflight', switches: ['-PreflightOnly'] },
    { mode: 'whole-app typecheck', switches: ['-VerifyFullTypecheck'] },
  ])('rejects the Android target before effects in $mode', ({ switches }) => {
    const result = spawnSync('powershell', [
      '-NoProfile', '-NonInteractive', '-File', launcher,
      '-EmbeddedBuildTarget', 'AndroidEmulator', ...switches,
    ], { cwd: root, windowsHide: true, encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('WHOLE_APP_ANDROID_EMBEDDED_TARGET_REQUIRES_BUILD_PREPARATION');
    expect(result.stdout).not.toContain('stage=');
    expect(result.stdout).not.toContain('WHOLE_APP_DEVELOPER_PREFLIGHT_GREEN');
  });
});
