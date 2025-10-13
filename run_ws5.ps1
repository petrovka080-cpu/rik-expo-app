$ErrorActionPreference = "Stop"

function Read-AllText([string]$path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}
function Write-AllText([string]$path, [string]$content) {
  $dir = Split-Path $path
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
}
function Get-RelativePath([string]$fromDir, [string]$toPath) {
  $fromUri = New-Object System.Uri(($fromDir.TrimEnd('\') + '\'))
  $toUri   = New-Object System.Uri($toPath)
  $relUri  = $fromUri.MakeRelativeUri($toUri)
  $rel     = [System.Uri]::UnescapeDataString($relUri.ToString())
  $rel -replace '/', '\'
}

if (!(Test-Path "package.json")) {
  Write-Host "Не нашёл package.json. Запусти скрипт из КОРНЯ проекта." -ForegroundColor Yellow
  exit 1
}

$postgrestPath = "src\lib\postgrest.ts"
$postgrestContent = @"
const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SB_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const PG_HEADERS: Record<string, string> = {
  apikey: SB_ANON,
  Authorization: `Bearer \${SB_ANON}`,
  "Accept-Profile": "public",
  "Content-Profile": "public",
};

export function ensureSelect(url: string): string {
  if (!url.includes("/rest/v1/")) return url;
  const hasSelect = /[?&]select=/.test(url);
  if (hasSelect) return url;
  return url.includes("?") ? `${url}&select=*` : `${url}?select=*`;
}

export async function rest(url: string, init: RequestInit = {}) {
  const finalUrl = ensureSelect(url);
  const headers = { ...PG_HEADERS, ...(init.headers as any) };
  const res = await fetch(finalUrl, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(\`REST \${res.status}: \${text || finalUrl}\`);
  }
  return res;
}

export async function restJson<T = any>(url: string, init: RequestInit = {}) {
  const res = await rest(url, init);
  return (await res.json()) as T;
}

export const REST_BASE = `${SB_URL}/rest/v1`;
"@

Write-AllText $postgrestPath $postgrestContent
Write-Host "✓ Создан/обновлён $postgrestPath" -ForegroundColor Green

$files = Get-ChildItem -Recurse -Include *.ts, *.tsx | Where-Object {
  $_.FullName -notmatch [regex]::Escape("src\lib\postgrest.ts")
}

$patternUrl = '\$\{process\.env\.EXPO_PUBLIC_SUPABASE_URL\}\/rest\/v1'
foreach ($f in $files) {
  $text = Read-AllText $f.FullName
  if ([regex]::IsMatch($text, $patternUrl)) {
    $new = [Regex]::Replace($text, $patternUrl, '${REST_BASE}')
    if ($new -ne $text) {
      Write-AllText $f.FullName $new
      Write-Host "• URL -> REST_BASE: $($f.FullName)" -ForegroundColor Cyan
    }
  }
}

function Add-Import([string]$filePath) {
  $t = Read-AllText $filePath
  $needsImport = ($t -match 'REST_BASE') -or ($t -match '\brestJson\b') -or ($t -match '\brest\(')
  if (-not $needsImport) { return }

  $from = Split-Path $filePath
  $to   = Resolve-Path "src\lib\postgrest.ts"
  $rel  = Get-RelativePath $from $to
  $rel  = $rel -replace '\\','/' | Out-String
  $rel  = $rel.Trim() -replace '\.ts$',''
  $importLine = "import { rest, restJson, REST_BASE } from `"$rel`";"

  if ($t -notmatch 'from .*postgrest"') {
    if ($t -match '^(import .+\r?\n)+') {
      $t = [Regex]::Replace($t, '^(import .+\r?\n)+', "`$0$importLine`r`n", [Text.RegularExpressions.RegexOptions]::Multiline)
    } else {
      $t = "$importLine`r`n$t"
    }
    Write-AllText $filePath $t
    Write-Host "• Добавлен импорт в: $filePath" -ForegroundColor Magenta
  }
}

foreach ($f in $files) {
  $text = Read-AllText $f.FullName
  if ($text -notmatch '/rest/v1/') { continue }
  $original = $text

  $text = [Regex]::Replace($text,
    'await\s*\(\s*await\s*fetch\(([^)]+)\)\s*\)\.json\(\)',
    'await restJson($1)')

  $text = [Regex]::Replace($text,
    'const\s+(\w+)\s*=\s*await\s*fetch\(([^)]+)\);\s*const\s+(\w+)\s*=\s*await\s*\1\.json\(\);',
    'const $3 = await restJson($2);')

  $text = [Regex]::Replace($text,
    'fetch\(([^)]*\/rest\/v1\/[^)]*)\)',
    'rest($1)')

  if ($text -ne $original) {
    Write-AllText $f.FullName $text
    Write-Host "• fetch→rest/restJson: $($f.FullName)" -ForegroundColor DarkCyan
    Add-Import $f.FullName
  }
}

Write-Host "✓ Готово. Перезапусти dev-сервер и проверь в Network: у GET теперь есть select=*, заголовки подставляются." -ForegroundColor Green
