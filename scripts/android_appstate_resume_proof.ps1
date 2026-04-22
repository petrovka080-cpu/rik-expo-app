
# ANDROID_APPSTATE_RESUME_PROOF_TAIL - v2 (fixed $Args conflict)
$SDK = "$env:LOCALAPPDATA\Android\Sdk"
$ADB = "$SDK\platform-tools\adb.exe"
$DEVICE = "emulator-5554"
$PKG = "com.azisbek_dzhantaev.rikexpoapp"
$MARKER = "PROOF_$(Get-Date -Format 'HHmmss')"
$LOGCAT_FILE = "$env:TEMP\appstate_proof_logcat_$MARKER.txt"
$RESULT_FILE = "artifacts/ANDROID_APPSTATE_RESUME_PROOF_TAIL_result.json"

function Run-Adb {
    param([string[]]$Cmd, [int]$TimeoutMs = 8000)
    $out = "$env:TEMP\adb_r_out.txt"
    $err = "$env:TEMP\adb_r_err.txt"
    if (Test-Path $out) { Remove-Item $out -Force }
    if (Test-Path $err) { Remove-Item $err -Force }
    $proc = Start-Process -FilePath $ADB -ArgumentList $Cmd `
        -RedirectStandardOutput $out -RedirectStandardError $err `
        -PassThru -NoNewWindow
    $done = $proc.WaitForExit($TimeoutMs)
    if (-not $done) { try { $proc.Kill() } catch {} }
    $stdout = if (Test-Path $out) { (Get-Content $out -Raw).Trim() } else { "" }
    $stderr = if (Test-Path $err) { (Get-Content $err -Raw).Trim() } else { "" }
    return @{ Out=$stdout; Err=$stderr; Done=$done; Code=($proc.ExitCode) }
}

Write-Host ""
Write-Host "=== ANDROID_APPSTATE_RESUME_PROOF_TAIL v2 ==="
Write-Host "Marker  : $MARKER"
Write-Host "Device  : $DEVICE"
Write-Host "Package : $PKG"
Write-Host ""

# ── 1. Device health ─────────────────────────────────────────────────────────
Write-Host "[1/8] Checking device state..."
$r = Run-Adb @("-s", $DEVICE, "get-state") -TimeoutMs 6000
Write-Host "  state='$($r.Out)' done=$($r.Done)"
if ($r.Out -ne "device") {
    Write-Host "BLOCKED: device not ready"
    @{ status="BLOCKED"; blocker="device_not_ready"; raw=$r.Out } | ConvertTo-Json | Set-Content $RESULT_FILE
    exit 1
}
Write-Host "  [OK] device ready"

# ── 2. App PID ───────────────────────────────────────────────────────────────
Write-Host "[2/8] Checking app PID..."
$r = Run-Adb @("-s", $DEVICE, "shell", "pidof", $PKG) -TimeoutMs 5000
$appPid = $r.Out.Trim()
Write-Host "  PID='$appPid'"
if (-not $appPid) {
    Write-Host "  App not running — launching..."
    Run-Adb @("-s", $DEVICE, "shell", "am", "start", "-n", "${PKG}/.MainActivity") -TimeoutMs 8000 | Out-Null
    Start-Sleep -Seconds 5
    $r2 = Run-Adb @("-s", $DEVICE, "shell", "pidof", $PKG) -TimeoutMs 5000
    $appPid = $r2.Out.Trim()
    Write-Host "  PID after launch='$appPid'"
    if (-not $appPid) {
        Write-Host "BLOCKED: app did not start"
        @{ status="BLOCKED"; blocker="app_not_started" } | ConvertTo-Json | Set-Content $RESULT_FILE
        exit 1
    }
}
Write-Host "  [OK] app running PID=$appPid"

# ── 3. Navigate to warehouse ──────────────────────────────────────────────────
Write-Host "[3/8] Navigating to warehouse screen via deep link..."
$r = Run-Adb @("-s", $DEVICE, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "rik:///office/warehouse", $PKG) -TimeoutMs 8000
Write-Host "  $($r.Out)"
Start-Sleep -Seconds 6
Write-Host "  [OK] warehouse deep link sent, settled 6s"

# ── 4. Verify foreground ──────────────────────────────────────────────────────
Write-Host "[4/8] Checking foreground activity..."
$r = Run-Adb @("-s", $DEVICE, "shell", "dumpsys", "activity", "top") -TimeoutMs 8000
$appIsForeground = $r.Out -match [regex]::Escape($PKG)
Write-Host "  app is foreground: $appIsForeground"
if (-not $appIsForeground) {
    Write-Host "  WARNING: app not foreground — may affect AppState signal"
}

# ── 5. Clear logcat ───────────────────────────────────────────────────────────
Write-Host "[5/8] Clearing logcat buffer..."
Run-Adb @("-s", $DEVICE, "logcat", "-c") -TimeoutMs 5000 | Out-Null
Write-Host "  [OK] buffer cleared"

# ── 6. Start background logcat capture ───────────────────────────────────────
Write-Host "[6/8] Starting logcat capture (background proc)..."
$logProc = Start-Process -FilePath $ADB `
    -ArgumentList @("-s", $DEVICE, "logcat", "-v", "threadtime") `
    -RedirectStandardOutput $LOGCAT_FILE `
    -PassThru -NoNewWindow
Write-Host "  logcat PID=$($logProc.Id), writing to $LOGCAT_FILE"
Start-Sleep -Seconds 1

# ── 7. HOME → resume cycle ────────────────────────────────────────────────────
Write-Host "[7/8] HOME keyevent (background) → wait 4s → resume (bring-to-front)..."
Run-Adb @("-s", $DEVICE, "shell", "input", "keyevent", "KEYCODE_HOME") -TimeoutMs 5000 | Out-Null
Write-Host "  HOME sent, sleeping 4s..."
Start-Sleep -Seconds 4

# Check app is now backgrounded
$r = Run-Adb @("-s", $DEVICE, "shell", "dumpsys", "activity", "top") -TimeoutMs 6000
$appIsBackground = $r.Out -notmatch [regex]::Escape($PKG)
Write-Host "  app backgrounded: $appIsBackground"

# Resume via am start (BRING_TO_FRONT semantics — not a cold start)
Write-Host "  Sending resume via am start --activity-brought-to-front..."
$r = Run-Adb @("-s", $DEVICE, "shell", "am", "start", `
    "-n", "${PKG}/.MainActivity", `
    "-f", "0x10000000") -TimeoutMs 8000
# FLAG_ACTIVITY_REORDER_TO_FRONT = 0x00020000; FLAG_ACTIVITY_SINGLE_TOP = 0x20000000
# Using just the package-level start which brings existing task to front
Write-Host "  Resume result: $($r.Out)"
Start-Sleep -Seconds 5
Write-Host "  Settled 5s after resume"

# ── 8. Stop logcat and analyse ────────────────────────────────────────────────
Write-Host "[8/8] Stopping logcat and analysing..."
try { Stop-Process -Id $logProc.Id -Force -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Milliseconds 500

$lines = if (Test-Path $LOGCAT_FILE) { Get-Content $LOGCAT_FILE } else { @() }
Write-Host "  Captured $($lines.Count) logcat lines"

$TARGET = "app_active_revalidation_triggered"
$hitLines     = @($lines | Where-Object { $_ -match $TARGET })
$skipLines    = @($lines | Where-Object { $_ -match "app_active_revalidation_skipped" })
$asLines      = @($lines | Where-Object { $_ -match "AppState" })
$whLines      = @($lines | Where-Object { $_ -match "warehouse" -or $_ -match "\[warehouse" })
$platformObs  = @($lines | Where-Object { $_ -match "platformObservability\|recordPlatformObs" })

Write-Host ""
Write-Host "=== SIGNAL ANALYSIS ==="
Write-Host "  '$TARGET' hit:           $($hitLines.Count)"
Write-Host "  revalidation_skipped:   $($skipLines.Count)"
Write-Host "  AppState mentions:       $($asLines.Count)"
Write-Host "  Warehouse log lines:     $($whLines.Count)"
Write-Host "  PlatformObservability:   $($platformObs.Count)"
Write-Host ""

if ($hitLines.Count -gt 0) {
    Write-Host "=== HIT LINES ==="
    $hitLines | ForEach-Object { Write-Host "  $_" }
}
if ($skipLines.Count -gt 0) {
    Write-Host "=== SKIPPED LINES (first 5) ==="
    $skipLines | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" }
}
if ($whLines.Count -gt 0) {
    Write-Host "=== WAREHOUSE LINES (first 10) ==="
    $whLines | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
}
if ($asLines.Count -gt 0) {
    Write-Host "=== APPSTATE LINES (first 5) ==="
    $asLines | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" }
}

$passed  = $hitLines.Count -gt 0
$status  = if ($passed) { "PASS" } else { "BLOCKED" }
$blocker = $null
if (-not $passed) {
    if ($lines.Count -lt 10) { $blocker = "logcat_nearly_empty" }
    elseif ($skipLines.Count -gt 0) { $blocker = "revalidation_skipped_by_guard" }
    elseif ($whLines.Count -eq 0) { $blocker = "warehouse_not_active_on_resume" }
    elseif ($asLines.Count -eq 0) { $blocker = "appstate_not_logged" }
    else { $blocker = "signal_not_emitted_exact_cause_unclear" }
}

$result = [ordered]@{
    status                   = $status
    passed                   = $passed
    marker                   = $MARKER
    device                   = $DEVICE
    package                  = $PKG
    targetEvent              = $TARGET
    signalFound              = $passed
    appWasBackground         = $appIsBackground
    logcatTotalLines         = $lines.Count
    matchingLinesCount       = $hitLines.Count
    skippedLinesCount        = $skipLines.Count
    appStateLinesCount       = $asLines.Count
    warehouseLinesCount      = $whLines.Count
    platformObsLinesCount    = $platformObs.Count
    blocker                  = $blocker
    matchingLines            = @($hitLines | Select-Object -First 5)
    skippedLines             = @($skipLines | Select-Object -First 5)
    warehouseLines           = @($whLines   | Select-Object -First 10)
    appStateLines            = @($asLines   | Select-Object -First 5)
    timestamp                = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}

$json = $result | ConvertTo-Json -Depth 5
$json | Set-Content $RESULT_FILE
Write-Host ""
Write-Host "Result: $status"
if ($blocker) { Write-Host "Blocker: $blocker" }
Write-Host "Artifact: $RESULT_FILE"
if (-not $passed) { exit 1 }
