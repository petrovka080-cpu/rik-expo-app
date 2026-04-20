# PDF-Z3 Android Timing

Status: ANDROID BLOCKED.

Checked at: 2026-04-20.

## Attempt

- `adb devices`: no attached emulator/device.
- Single recovery attempt: `emulator -list-avds`.
- Result: `emulator` command is not available in PATH, so no AVD could be listed or started.

## Verdict

Android proof is environment BLOCKED, not code BLOCKED.

Wave rule honored:

- one recovery attempt only
- no extended adb/verifier debugging
- no source changes for Android proof
