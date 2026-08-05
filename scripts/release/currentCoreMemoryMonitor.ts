import { spawn, type ChildProcess } from "node:child_process";

export type WindowsProcessSnapshot = {
  pid: number;
  parentPid: number;
  creationTime: string;
  commandLine: string;
  workingSetBytes: number;
};

export type LockedWindowsProcessIdentity = {
  pid: number;
  parentPid: number;
  creationTime: string;
  commandLine: string;
};

function creationRank(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const compact = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
  );
  if (!compact) return Number.NaN;
  return Date.UTC(
    Number(compact[1]),
    Number(compact[2]) - 1,
    Number(compact[3]),
    Number(compact[4]),
    Number(compact[5]),
    Number(compact[6]),
  );
}

export function lockWindowsRootProcessIdentity(input: {
  snapshots: readonly WindowsProcessSnapshot[];
  rootPid: number;
  runnerPid: number;
  expectedCommandFragments: readonly string[];
}): LockedWindowsProcessIdentity | null {
  const root = input.snapshots.find(
    (candidate) => candidate.pid === input.rootPid,
  );
  if (
    !root ||
    !root.creationTime ||
    root.parentPid !== input.runnerPid ||
    input.expectedCommandFragments.some(
      (fragment) =>
        !root.commandLine.toLowerCase().includes(fragment.toLowerCase()),
    )
  ) {
    return null;
  }
  return {
    pid: root.pid,
    parentPid: root.parentPid,
    creationTime: root.creationTime,
    commandLine: root.commandLine,
  };
}

export function collectLockedWindowsProcessTree(
  snapshots: readonly WindowsProcessSnapshot[],
  root: LockedWindowsProcessIdentity,
): WindowsProcessSnapshot[] {
  const exactRoot = snapshots.find(
    (candidate) =>
      candidate.pid === root.pid &&
      candidate.creationTime === root.creationTime &&
      candidate.parentPid === root.parentPid &&
      candidate.commandLine === root.commandLine,
  );
  if (!exactRoot) return [];

  const owned = new Map<number, WindowsProcessSnapshot>([
    [exactRoot.pid, exactRoot],
  ]);
  let added = true;
  while (added) {
    added = false;
    for (const candidate of snapshots) {
      if (owned.has(candidate.pid) || !candidate.creationTime) continue;
      const parent = owned.get(candidate.parentPid);
      if (!parent) continue;
      const parentRank = creationRank(parent.creationTime);
      const childRank = creationRank(candidate.creationTime);
      if (
        !Number.isFinite(parentRank) ||
        !Number.isFinite(childRank) ||
        childRank < parentRank
      ) {
        continue;
      }
      owned.set(candidate.pid, candidate);
      added = true;
    }
  }
  return [...owned.values()];
}

function psLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildWindowsCurrentCoreMemoryMonitorScript(input: {
  evidencePath: string;
  expectedCommandFragments: readonly string[];
  graceMs?: number;
  maxDurationMs?: number;
  readyPath?: string;
  rootPid: number;
  runnerPid: number;
}): string {
  const evidencePath = psLiteral(input.evidencePath);
  const fragments = input.expectedCommandFragments.map(psLiteral).join(",");
  const graceMs = input.graceMs ?? 2_000;
  const maxDurationMs = input.maxDurationMs ?? 30 * 60 * 1_000;
  const readyPath = input.readyPath ? psLiteral(input.readyPath) : "$null";
  return `
$ErrorActionPreference='Stop'
$rootProcessId=${input.rootPid}
$runnerProcessId=${input.runnerPid}
$expectedFragments=@(${fragments})
$evidencePath=${evidencePath}
$temporaryPath="$evidencePath.tmp"
$readyPath=${readyPath}
$readyTemporaryPath=if($null -eq $readyPath){$null}else{"$readyPath.tmp"}
$readyWritten=$false
$startedAt=[DateTime]::UtcNow
$deadline=$startedAt.AddMilliseconds(${maxDurationMs})
$graceMs=${graceMs}
[int64]$peak=0
[int]$samples=0
[int]$descendantsObserved=0
$status='INFRASTRUCTURE_RED'
$blocker='MEMORY_MONITOR_NOT_INITIALIZED'
$rootCreationTime=$null
$rootCommandLine=$null
$owned=@{}

function Write-MonitorReady([bool]$lockedValue) {
  if($null -eq $readyPath){return}
  $readyPayload=[ordered]@{
    schema='current-core-memory-monitor-handshake-v1'
    locked=$lockedValue
    blocker=if($lockedValue){$null}else{$blocker}
    root_pid=$rootProcessId
    root_parent_pid=$runnerProcessId
    root_creation_time=$rootCreationTime
    root_command_line=$rootCommandLine
    writer_complete=$true
  }
  $readyJson=$readyPayload | ConvertTo-Json -Depth 4
  [System.IO.File]::WriteAllText($readyTemporaryPath,$readyJson,[System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $readyTemporaryPath -Destination $readyPath -Force
  $script:readyWritten=$true
}

function Write-MemoryEvidence {
  $payload=[ordered]@{
    schema='current-core-memory-evidence-v3'
    status=$status
    blocker=$blocker
    writer_complete=$true
    root_pid=$rootProcessId
    root_parent_pid=$runnerProcessId
    root_creation_time=$rootCreationTime
    root_command_line=$rootCommandLine
    expected_command_fragments=$expectedFragments
    memory_peak_bytes=$peak
    samples=$samples
    descendants_observed=$descendantsObserved
    grace_ms=$graceMs
    max_duration_ms=${maxDurationMs}
    started_at=$startedAt.ToString('o')
    completed_at=[DateTime]::UtcNow.ToString('o')
  }
  $json=$payload | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($temporaryPath,$json,[System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporaryPath -Destination $evidencePath -Force
}

try {
  $initial=@(Get-CimInstance Win32_Process -ErrorAction Stop)
  $root=@($initial | Where-Object { [int]$_.ProcessId -eq [int]$rootProcessId })
  if($root.Count -ne 1){$blocker='ROOT_PROCESS_NOT_FOUND'}
  elseif([int]$root[0].ParentProcessId -ne [int]$runnerProcessId){$blocker='ROOT_RUNNER_OWNERSHIP_MISMATCH'}
  elseif([string]::IsNullOrWhiteSpace([string]$root[0].CreationDate)){$blocker='ROOT_CREATION_TIME_MISSING'}
  else {
    $rootCommandLine=[string]$root[0].CommandLine
    $identityMatches=$true
    foreach($fragment in $expectedFragments){
      if($rootCommandLine.IndexOf($fragment,[StringComparison]::OrdinalIgnoreCase) -lt 0){
        $identityMatches=$false
      }
    }
    if(-not $identityMatches){$blocker='ROOT_COMMAND_IDENTITY_MISMATCH'}
    else {
      $rootCreationTime=[string]$root[0].CreationDate
      $owned[[int]$rootProcessId]=$rootCreationTime
      Write-MonitorReady $true
      $treeGoneAt=$null
      $consecutiveQueryFailures=0
      while($true){
        $now=[DateTime]::UtcNow
        if($now -gt $deadline){$blocker='MEMORY_MONITOR_DEADLINE_EXCEEDED';break}
        try {
          $all=@(Get-CimInstance Win32_Process -ErrorAction Stop)
          $consecutiveQueryFailures=0
        } catch {
          $consecutiveQueryFailures += 1
          if($consecutiveQueryFailures -ge 4){$blocker='PROCESS_SNAPSHOT_UNAVAILABLE';break}
          Start-Sleep -Milliseconds 250
          continue
        }
        $liveOwned=@{}
        foreach($candidate in $all){
          $candidatePid=[int]$candidate.ProcessId
          if(
            $owned.ContainsKey($candidatePid) -and
            [string]$candidate.CreationDate -eq [string]$owned[$candidatePid]
          ){
            $liveOwned[$candidatePid]=[string]$candidate.CreationDate
          }
        }
        do {
          $added=$false
          foreach($candidate in $all){
            $candidatePid=[int]$candidate.ProcessId
            $parentPid=[int]$candidate.ParentProcessId
            if($owned.ContainsKey($candidatePid) -or -not $liveOwned.ContainsKey($parentPid)){continue}
            $candidateCreation=[string]$candidate.CreationDate
            $parentCreation=[string]$liveOwned[$parentPid]
            if(
              [string]::IsNullOrWhiteSpace($candidateCreation) -or
              $candidateCreation.CompareTo($parentCreation) -lt 0
            ){continue}
            $owned[$candidatePid]=$candidateCreation
            $liveOwned[$candidatePid]=$candidateCreation
            $added=$true
          }
        } while($added)
        $tree=@($all | Where-Object {
          $pidValue=[int]$_.ProcessId
          $owned.ContainsKey($pidValue) -and
          [string]$_.CreationDate -eq [string]$owned[$pidValue]
        })
        if($tree.Count -gt 0){
          $treeGoneAt=$null
          [int64]$current=($tree | Measure-Object -Property WorkingSetSize -Sum).Sum
          if($current -gt $peak){$peak=$current}
          $descendantsObserved=[Math]::Max($descendantsObserved,$tree.Count-1)
          $samples += 1
        } else {
          if($null -eq $treeGoneAt){$treeGoneAt=$now}
          if(($now-$treeGoneAt).TotalMilliseconds -ge $graceMs){
            $status='COMPLETE'
            $blocker=$null
            break
          }
        }
        Start-Sleep -Milliseconds 250
      }
    }
  }
} catch {
  $blocker="MEMORY_MONITOR_EXCEPTION:$($_.Exception.GetType().Name)"
} finally {
  if(-not $readyWritten){Write-MonitorReady $false}
  Write-MemoryEvidence
}
`.trim();
}

export function startWindowsCurrentCoreMemoryMonitor(input: {
  cwd: string;
  evidencePath: string;
  expectedCommandFragments: readonly string[];
  graceMs?: number;
  maxDurationMs?: number;
  readyPath?: string;
  rootPid: number;
  runnerPid: number;
}): ChildProcess {
  return spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      buildWindowsCurrentCoreMemoryMonitorScript(input),
    ],
    {
      cwd: input.cwd,
      windowsHide: true,
      stdio: "ignore",
    },
  );
}
