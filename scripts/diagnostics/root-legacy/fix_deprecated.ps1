# === fix_deprecated.ps1 (С‚РѕР»СЊРєРѕ src Рё app) ===
$ErrorActionPreference = "Stop"

function Read-AllText([string]$path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}
function Write-AllText([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
}

# Р‘РµСЂС‘Рј С‚РѕР»СЊРєРѕ РёСЃС…РѕРґРЅРёРєРё РІ src Рё app
$files = Get-ChildItem -Recurse -Include *.ts, *.tsx -Path src, app

foreach ($f in $files) {
  $text = Read-AllText $f.FullName
  $original = $text

  # pointerEvents="..."  -> style={{ pointerEvents: "..." }}
  $text = [Regex]::Replace($text,
    'pointerEvents\s*=\s*"([^"]+)"',
    'style={{ pointerEvents: "$1" }}')

  # РџСЂРёРјРёС‚РёРІРЅР°СЏ С‡РёСЃС‚РєР° shadow* РІ СЃС‚РёР»СЏС… Рё РґРѕР±Р°РІР»РµРЅРёРµ boxShadow
  if ($text -match 'shadowColor|shadowOpacity|shadowOffset|shadowRadius') {
    $text = [Regex]::Replace($text, 'shadowColor\s*:\s*["'']?#?[0-9A-Fa-f]+["'']?,?\s*', '')
    $text = [Regex]::Replace($text, 'shadowOpacity\s*:\s*[0-9\.]+,?\s*', '')
    $text = [Regex]::Replace($text, 'shadowOffset\s*:\s*{[^}]+},?\s*', '')
    $text = [Regex]::Replace($text, 'shadowRadius\s*:\s*[0-9\.]+,?', '')
    # РґРѕР±Р°РІРёРј РїСЂРѕСЃС‚РѕР№ boxShadow РІ РѕР±СЉРµРєС‚С‹ СЃС‚РёР»РµР№ (Р»СѓС‡С€Рµ СЂСѓРєР°РјРё РїРѕС‚РѕРј РѕС‚С‚РѕС‡РёС‚СЊ)
    $text = $text -replace '{([^}]*)}', '{`$1 boxShadow: "0px 2px 4px rgba(0,0,0,0.3)", }'
  }

  if ($text -ne $original) {
    Write-AllText $f.FullName $text
    Write-Host "вњ” РСЃРїСЂР°РІР»РµРЅ: $($f.FullName)" -ForegroundColor Cyan
  }
}

Write-Host "=== Р“РѕС‚РѕРІРѕ. РџРµСЂРµСЃРѕР±РµСЂРё РїСЂРѕРµРєС‚ ===" -ForegroundColor Green
