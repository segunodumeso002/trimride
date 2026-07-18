param(
  [switch]$HealthOnly,
  [string]$FirebaseServiceAccountPath = 'C:\Users\SCHOOL\Downloads\trimride-4a485-firebase-adminsdk-fbsvc-e08d28f128.json',
  [string]$EmulatorId = 'emulator-5554'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'BarberBackend'
$customerAppPath = Join-Path $repoRoot 'BarberCustomerApp'
$barberAppPath = Join-Path $repoRoot 'TrimRideBarber'
$adbPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

function Test-PortListening {
  param([int]$Port)

  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Get-MetroStatus {
  param([int]$Port)

  try {
    return Invoke-RestMethod -Uri ("http://localhost:{0}/status" -f $Port) -TimeoutSec 3
  } catch {
    return $null
  }
}

function Start-BackgroundCommand {
  param(
    [string]$WorkingDirectory,
    [string]$CommandLine,
    [string]$Label
  )

  $process = Start-Process -FilePath $env:ComSpec -ArgumentList '/c', $CommandLine -WorkingDirectory $WorkingDirectory -WindowStyle Minimized -PassThru
  Write-Host ("{0} started (PID {1})" -f $Label, $process.Id)
  return $process
}

function Ensure-Backend {
  if (Test-PortListening -Port 3001) {
    Write-Host 'Backend already listening on 3001.'
    return
  }

  if (-not (Test-Path $FirebaseServiceAccountPath)) {
    throw "Firebase service account file not found: $FirebaseServiceAccountPath"
  }

  $env:FIREBASE_SERVICE_ACCOUNT_PATH = $FirebaseServiceAccountPath
  $process = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $backendPath -WindowStyle Minimized -PassThru

  if (-not (Wait-ForPort -Port 3001)) {
    throw "Backend failed to listen on port 3001 after start attempt (PID $($process.Id))."
  }

  Write-Host ("Backend ready on 3001 (PID {0})." -f $process.Id)
}

function Ensure-Metro {
  param(
    [string]$WorkingDirectory,
    [int]$Port,
    [string]$Label
  )

  $status = Get-MetroStatus -Port $Port
  if ($status -eq 'packager-status:running') {
    Write-Host ("{0} already running on {1}." -f $Label, $Port)
    return
  }

  $commandLine = "npx.cmd react-native start --reset-cache --host 0.0.0.0 --port $Port --no-interactive"
  $process = Start-BackgroundCommand -WorkingDirectory $WorkingDirectory -CommandLine $commandLine -Label $Label

  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    $status = Get-MetroStatus -Port $Port
    if ($status -eq 'packager-status:running') {
      Write-Host ("{0} ready on {1} (PID {2})." -f $Label, $Port, $process.Id)
      return
    }
    Start-Sleep -Milliseconds 750
  }

  throw ("{0} failed to report healthy status on port {1} after start attempt (PID {2})." -f $Label, $Port, $process.Id)
}

function Ensure-AdbReverse {
  $adb = if (Test-Path $adbPath) { $adbPath } else { 'adb' }

  try {
    $devices = & $adb devices
  } catch {
    Write-Warning 'ADB is not available; skipping reverse port setup.'
    return
  }

  if (-not ($devices -match ("^{0}\s+device$" -f [regex]::Escape($EmulatorId)))) {
    Write-Warning ("Emulator {0} not connected; skipping reverse port setup." -f $EmulatorId)
    return
  }

  foreach ($port in 3001, 8081, 8082) {
    & $adb -s $EmulatorId reverse ("tcp:{0}" -f $port) ("tcp:{0}" -f $port) | Out-Null
  }

  Write-Host ("ADB reverse applied for {0}: 3001, 8081, 8082." -f $EmulatorId)
}

function Show-Health {
  $rows = @(
    [pscustomobject]@{ Component = 'Backend'; Port = 3001; Listening = Test-PortListening -Port 3001; Status = 'n/a' },
    [pscustomobject]@{ Component = 'Customer Metro'; Port = 8081; Listening = Test-PortListening -Port 8081; Status = (Get-MetroStatus -Port 8081) },
    [pscustomobject]@{ Component = 'Barber Metro'; Port = 8082; Listening = Test-PortListening -Port 8082; Status = (Get-MetroStatus -Port 8082) }
  )

  $rows | Format-Table -AutoSize
}

if (-not $HealthOnly) {
  Ensure-Backend
  Ensure-Metro -WorkingDirectory $customerAppPath -Port 8081 -Label 'Customer Metro'
  Ensure-Metro -WorkingDirectory $barberAppPath -Port 8082 -Label 'Barber Metro'
  Ensure-AdbReverse
}

Show-Health