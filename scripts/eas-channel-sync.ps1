$ErrorActionPreference = "Stop"

$expectedMappings = [ordered]@{
  development = "development"
  preview = "preview"
  production = "production"
}

Write-Host "[ota] loading existing EAS branches..."
$branchData = npx eas branch:list --json --non-interactive | ConvertFrom-Json
$existingBranches = @{}
foreach ($branch in $branchData) {
  $existingBranches[$branch.name] = $true
}

foreach ($branchName in ($expectedMappings.Values | Select-Object -Unique)) {
  if (-not $existingBranches.ContainsKey($branchName)) {
    Write-Host "[ota] creating missing branch '$branchName'..."
    npx eas branch:create $branchName --json --non-interactive | Out-Null
  }
}

Write-Host "[ota] syncing channel pointers..."
foreach ($entry in $expectedMappings.GetEnumerator()) {
  Write-Host "[ota] $($entry.Key) -> $($entry.Value)"
  npx eas channel:edit $entry.Key --branch $entry.Value --json --non-interactive | Out-Null
}

Write-Host "[ota] final mapping:"
$channelData = npx eas channel:list --json --non-interactive | ConvertFrom-Json
foreach ($channel in $channelData.currentPage) {
  $branchNames = @($channel.updateBranches | ForEach-Object { $_.name }) -join ", "
  Write-Host ("  - " + $channel.name + " -> " + $branchNames)
}
