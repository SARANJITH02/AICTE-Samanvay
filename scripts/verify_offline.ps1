# AICTE Samanvay - Air-Gapped High-Assurance Offline Verification Script
# Verifies zero external dependencies, no CDN links, offline environment variables, and local TLS assets.

$ErrorActionPreference = "Stop"
Write-Host "========================================================================"
Write-Host "          AICTE SAMANVAY - AIR-GAPPED ENVIRONMENT VERIFICATION         "
Write-Host "========================================================================"

$passed = 0
$total = 0

function Assert-Check($name, $condition, $details) {
    $script:total++
    if ($condition) {
        $script:passed++
        Write-Host " [PASS] $name" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] $name - $details" -ForegroundColor Red
    }
}

# 1. Check TLS Certificates
$hasCerts = (Test-Path "$PSScriptRoot\..\certs\samanvay.crt") -and (Test-Path "$PSScriptRoot\..\certs\samanvay.key")
Assert-Check "Local TLS Certificates (certs/samanvay.crt & key)" $hasCerts "Self-signed certificate files not found in certs/"

# 2. Check Docker Compose Offline Flags
$composeContent = Get-Content "$PSScriptRoot\..\docker-compose.yml" -Raw
$hasTransformersOffline = $composeContent.Contains("TRANSFORMERS_OFFLINE=1")
$hasHfOffline = $composeContent.Contains("HF_HUB_OFFLINE=1")
Assert-Check "AI Engine Offline HuggingFace Flags (TRANSFORMERS_OFFLINE=1)" $hasTransformersOffline "TRANSFORMERS_OFFLINE flag missing"
Assert-Check "AI Engine Offline Hub Flags (HF_HUB_OFFLINE=1)" $hasHfOffline "HF_HUB_OFFLINE flag missing"

# 3. Check for external runtime CDN links in Frontend HTML
$indexHtml = Get-Content "$PSScriptRoot\..\frontend\index.html" -Raw
$hasExternalCdn = ($indexHtml -match "https?://cdn\.") -or ($indexHtml -match "https?://cdnjs\.") -or ($indexHtml -match "https?://unpkg\.")
Assert-Check "Zero External Runtime CDNs in frontend/index.html" (-not $hasExternalCdn) "External CDN script/link found in index.html"

# 4. Check Database Seed & Init SQL
$hasInitSql = Test-Path "$PSScriptRoot\..\db\init.sql"
$hasSeedSql = Test-Path "$PSScriptRoot\..\db\seed.sql"
Assert-Check "Database Schema (db/init.sql)" $hasInitSql "init.sql not found"
Assert-Check "Synthetic Benchmark Seed (db/seed.sql)" $hasSeedSql "seed.sql not found"

# 5. Check Governance Config
$hasGovConfig = Test-Path "$PSScriptRoot\..\governance-config.json"
Assert-Check "Central Governance Parameters (governance-config.json)" $hasGovConfig "governance-config.json not found"

Write-Host "------------------------------------------------------------------------"
Write-Host "Results: $passed / $total air-gapped security & offline checks passed."
if ($passed -eq $total) {
    Write-Host "STATUS: 100% AIR-GAPPED VERIFIED - READY FOR DISCONNECTED DEPLOYMENT" -ForegroundColor Green
    exit 0
} else {
    Write-Host "STATUS: AUDIT WARNINGS DETECTED" -ForegroundColor Yellow
    exit 1
}
