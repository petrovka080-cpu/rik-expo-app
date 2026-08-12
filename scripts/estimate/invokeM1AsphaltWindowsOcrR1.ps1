param(
  [Parameter(Mandatory = $true)][string]$InputRoot,
  [Parameter(Mandatory = $true)][string]$OutputRoot,
  [Parameter(Mandatory = $true)][int]$FirstPage,
  [Parameter(Mandatory = $true)][int]$LastPage,
  [string]$LanguageTag = "ru-RU"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

function Invoke-Await {
  param(
    [Parameter(Mandatory = $true)]$Operation,
    [Parameter(Mandatory = $true)][Type]$ResultType
  )
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1
  if (-not $method) { throw "WINDOWS_RUNTIME_AS_TASK_GENERIC_METHOD_NOT_FOUND" }
  $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  $task.Wait()
  return $task.Result
}

function Get-TextSha256 {
  param([Parameter(Mandatory = $true)][string]$Text)
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($Text)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

if ($FirstPage -lt 1 -or $LastPage -lt $FirstPage) { throw "OCR_PAGE_RANGE_INVALID" }
$resolvedInput = (Resolve-Path -LiteralPath $InputRoot).Path
$resolvedOutput = [IO.Path]::GetFullPath($OutputRoot)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

$language = [Windows.Globalization.Language]::new($LanguageTag)
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if ($null -eq $engine) { throw "WINDOWS_OCR_LANGUAGE_ENGINE_UNAVAILABLE:$LanguageTag" }

$pages = @()
for ($pageNumber = $FirstPage; $pageNumber -le $LastPage; $pageNumber += 1) {
  $inputFile = Join-Path $resolvedInput ("page-{0:D4}.png" -f $pageNumber)
  if (-not (Test-Path -LiteralPath $inputFile)) { throw "OCR_INPUT_PAGE_MISSING:${pageNumber}:$inputFile" }

  $storageFile = Invoke-Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($inputFile)) ([Windows.Storage.StorageFile])
  $stream = Invoke-Await ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  try {
    $decoder = Invoke-Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Invoke-Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    try {
      $ocrResult = Invoke-Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
      $text = ($ocrResult.Text -replace "\r\n", "`n").Trim()
    } finally {
      if ($null -ne $bitmap) { $bitmap.Dispose() }
    }
  } finally {
    $stream.Dispose()
  }

  $outputFile = Join-Path $resolvedOutput ("page-{0:D4}.txt" -f $pageNumber)
  if (Test-Path -LiteralPath $outputFile) {
    $existing = [IO.File]::ReadAllText($outputFile, [Text.Encoding]::UTF8)
    if ($existing -ne $text) { throw "IMMUTABLE_OCR_TEXT_MISMATCH:${pageNumber}:$outputFile" }
  } else {
    [IO.File]::WriteAllText($outputFile, $text, [Text.UTF8Encoding]::new($false))
  }

  $pages += [ordered]@{
    pageNumber = $pageNumber
    pngFile = ("page-{0:D4}.png" -f $pageNumber)
    pngSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $inputFile).Hash.ToLowerInvariant()
    textFile = ("page-{0:D4}.txt" -f $pageNumber)
    textSha256 = Get-TextSha256 $text
    characterCount = $text.Length
    lineCount = if ($text.Length -eq 0) { 0 } else { ($text -split "`n").Count }
    verdict = if ($text.Length -gt 0) { "OCR_TEXT_PRESENT_MANUAL_VERIFICATION_REQUIRED" } else { "OCR_EMPTY_BLOCKED" }
  }
  if (($pageNumber - $FirstPage + 1) % 20 -eq 0) {
    Write-Output ("OCR_PROGRESS page={0} completed={1}" -f $pageNumber, ($pageNumber - $FirstPage + 1))
  }
}

$emptyPages = @($pages | Where-Object { $_.characterCount -eq 0 })
$manifest = [ordered]@{
  schemaVersion = "m1-asphalt-five-p0-remediation-r1:windows-ocr:v1"
  languageTag = $LanguageTag
  recognizerLanguageTag = $engine.RecognizerLanguage.LanguageTag
  firstPage = $FirstPage
  lastPage = $LastPage
  pageCount = $pages.Count
  emptyPageCount = $emptyPages.Count
  pages = $pages
  automaticClauseAdmissionPerformed = $false
  verdict = if ($emptyPages.Count -eq 0) { "GREEN_OCR_TEXT_PRESENT_MANUAL_VERIFICATION_REQUIRED" } else { "BLOCKED_OCR_EMPTY_PAGES" }
}
$manifestName = "OCR_RUN_{0:D4}_{1:D4}.json" -f $FirstPage, $LastPage
$manifestPath = Join-Path $resolvedOutput $manifestName
$manifestText = ($manifest | ConvertTo-Json -Depth 8) + "`n"
if (Test-Path -LiteralPath $manifestPath) {
  $existingManifest = [IO.File]::ReadAllText($manifestPath, [Text.Encoding]::UTF8)
  if ($existingManifest -ne $manifestText) { throw "IMMUTABLE_OCR_MANIFEST_MISMATCH:$manifestPath" }
} else {
  [IO.File]::WriteAllText($manifestPath, $manifestText, [Text.UTF8Encoding]::new($false))
}

$totalCharacters = ($pages | ForEach-Object { [int]$_["characterCount"] } | Measure-Object -Sum).Sum
[ordered]@{
  verdict = $manifest.verdict
  languageTag = $manifest.languageTag
  recognizerLanguageTag = $manifest.recognizerLanguageTag
  firstPage = $FirstPage
  lastPage = $LastPage
  pageCount = $pages.Count
  emptyPageCount = $emptyPages.Count
  totalCharacters = $totalCharacters
  manifest = $manifestName
} | ConvertTo-Json -Depth 4
