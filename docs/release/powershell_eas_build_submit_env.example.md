# PowerShell EAS Build/Submit Env Example

Names only. Do not commit real values.

```powershell
# Expo auth
$env:EXPO_TOKEN = "<secret>"

# Android emulator APK gate
$env:E2E_ALLOW_ANDROID_APK_BUILD = "true"
$env:E2E_ANDROID_BUILD_PROFILE = "preview"

# iOS build + submit gate
$env:E2E_ALLOW_IOS_BUILD = "true"
$env:E2E_ALLOW_IOS_SUBMIT = "true"
$env:E2E_IOS_BUILD_PROFILE = "production"
$env:E2E_IOS_SUBMIT_PROFILE = "production"

# Apple submit secrets, if required by the EAS account/profile
$env:EXPO_APPLE_ID = "<secret>"
$env:EXPO_APPLE_APP_SPECIFIC_PASSWORD = "<secret>"
$env:EXPO_ASC_APP_ID = "<secret>"

# Optional AI role-screen E2E secrets
$env:E2E_DIRECTOR_EMAIL = "<secret>"
$env:E2E_DIRECTOR_PASSWORD = "<secret>"
$env:E2E_FOREMAN_EMAIL = "<secret>"
$env:E2E_FOREMAN_PASSWORD = "<secret>"
$env:E2E_BUYER_EMAIL = "<secret>"
$env:E2E_BUYER_PASSWORD = "<secret>"
$env:E2E_ACCOUNTANT_EMAIL = "<secret>"
$env:E2E_ACCOUNTANT_PASSWORD = "<secret>"
$env:E2E_CONTRACTOR_EMAIL = "<secret>"
$env:E2E_CONTRACTOR_PASSWORD = "<secret>"
```

Secrets must be passed through process env only, never CLI args, committed files, artifacts, or logs.
