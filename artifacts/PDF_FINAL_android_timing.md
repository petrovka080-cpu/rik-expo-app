# PDF-FINAL Android Timing

Status: ANDROID BLOCKED
Checked at: 2026-04-21 Asia/Bishkek

## Attempt

- Preflight command: `adb devices`
- Result: timed out after 24 seconds.
- Recovery attempt: `adb kill-server; adb start-server; adb devices`
- Result: timed out after 64 seconds.

## Verdict

Android runtime proof is environment-blocked. The wave rule allows Android PASS or honest BLOCKED after one recovery attempt and a short timebox.

No product-code workaround, verifier hook, adapter, VM shim, ignore, or suppression was added for Android.
