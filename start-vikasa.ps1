$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
$python = Join-Path $root '.venv\Scripts\python.exe'
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$backendUrl = 'http://127.0.0.1:5000'
$healthUrl = "$backendUrl/api/health"
$dashboardUrl = 'http://localhost:5173'
$backendLog = Join-Path $env:TEMP 'vikasa-backend.log'
$frontendLog = Join-Path $env:TEMP 'vikasa-frontend.log'
$backendErrorLog = Join-Path $env:TEMP 'vikasa-backend-error.log'
$frontendErrorLog = Join-Path $env:TEMP 'vikasa-frontend-error.log'

function Get-Listener {
    param([int]$Port)
    @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Test-HttpEndpoint {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
        return ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 300)
    } catch {
        return $false
    }
}

function Wait-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpEndpoint -Url $Url) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Test-FrontendApiConfiguration {
    try {
        $source = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173/src/main.tsx' -TimeoutSec 5
        return $source.Content.Contains($backendUrl)
    } catch {
        return $false
    }
}

if (-not (Test-Path $python)) {
    throw "Project Python environment not found: $python"
}
if (-not (Test-Path (Join-Path $root '.env'))) {
    throw "Root .env file not found. Create/configure it locally before starting Vikasa."
}
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    throw 'Frontend dependencies are missing. Run npm install in the frontend folder first.'
}
if (-not $npm) {
    throw 'npm.cmd was not found on PATH.'
}

Write-Host 'Starting Vikasa backend and dashboard...' -ForegroundColor Cyan
$frontendStarted = $false

if (Test-HttpEndpoint -Url $healthUrl) {
    Write-Host 'Backend is already healthy.' -ForegroundColor Green
} else {
    if ((Get-Listener -Port 5000).Count -gt 0) {
        throw 'Port 5000 is occupied, but the Vikasa health endpoint is not responding.'
    }

    $env:API_HOST = '0.0.0.0'
    $env:API_PORT = '5000'
    Start-Process `
        -FilePath $python `
        -ArgumentList '-c "from backend.app import main; main()"' `
        -WorkingDirectory $root `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErrorLog `
        -WindowStyle Hidden | Out-Null

    if (-not (Wait-HttpEndpoint -Url $healthUrl -TimeoutSeconds 60)) {
        throw "Flask did not become healthy on port 5000. Check logs: $backendErrorLog"
    }
    Write-Host 'Backend is healthy on port 5000.' -ForegroundColor Green
}

if (Test-HttpEndpoint -Url "$dashboardUrl/") {
    Write-Host 'Frontend is already responding.' -ForegroundColor Green
} else {
    if ((Get-Listener -Port 5173).Count -gt 0) {
        throw 'Port 5173 is occupied, but the Vikasa dashboard is not responding.'
    }

    $env:VITE_API_BASE_URL = $backendUrl
    Start-Process `
        -FilePath $npm.Source `
        -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1') `
        -WorkingDirectory $frontend `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError $frontendErrorLog `
        -WindowStyle Hidden | Out-Null

    if (-not (Wait-HttpEndpoint -Url "$dashboardUrl/" -TimeoutSeconds 45)) {
        throw "Vite did not become ready on port 5173. Check logs: $frontendErrorLog"
    }
    $frontendStarted = $true
    Write-Host 'Dashboard frontend is responding on port 5173.' -ForegroundColor Green
}

if (-not (Test-FrontendApiConfiguration)) {
    throw 'The running frontend is not configured for the local Flask API. Stop its Vite process, then run this script again.'
}

if (-not $frontendStarted) {
    Start-Process $dashboardUrl
}

Write-Host ''
Write-Host 'Vikasa is ready:' -ForegroundColor Green
Write-Host "  Dashboard: $dashboardUrl"
Write-Host "  Backend:   $backendUrl"
Write-Host "  Health:    $healthUrl"
Write-Host "Logs (if needed): $env:TEMP\vikasa-*.log"
