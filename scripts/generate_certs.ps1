# AICTE Samanvay - Self-Signed TLS Certificate Generator for Nginx Gateway
param (
    [string]$OutputDir = "$PSScriptRoot\..\certs",
    [string]$Domain = "localhost"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

$openssl = "openssl"
if (-not (Get-Command "openssl" -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
        $openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
    } else {
        Write-Error "OpenSSL CLI was not found. Please ensure Git or OpenSSL is installed."
        exit 1
    }
}

$certPath = Join-Path $OutputDir "samanvay.crt"
$keyPath = Join-Path $OutputDir "samanvay.key"

Write-Host "[TLS] Generating high-assurance self-signed X.509 certificate for $Domain..."
& $openssl req -x509 -nodes -days 1825 -newkey rsa:2048 `
    -keyout $keyPath -out $certPath `
    -subj "/CN=$Domain/O=AICTE Samanvay/C=IN" `
    -addext "subjectAltName=DNS:$Domain,IP:127.0.0.1,DNS:samanvay.aicte.gov.in"

Write-Host "[TLS] Certificate generated successfully:"
Write-Host "      Certificate: $certPath"
Write-Host "      Private Key: $keyPath"
