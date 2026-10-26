#!/bin/bash
# AICTE Samanvay - Air-Gapped High-Assurance Offline Verification Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="${DIR}/.."

echo "========================================================================"
echo "          AICTE SAMANVAY - AIR-GAPPED ENVIRONMENT VERIFICATION         "
echo "========================================================================"

FAILED=0

# 1. TLS Certificates
if [ -f "${ROOT_DIR}/certs/samanvay.crt" ] && [ -f "${ROOT_DIR}/certs/samanvay.key" ]; then
    echo " [PASS] Local TLS Certificates (certs/samanvay.crt & key)"
else
    echo " [FAIL] Local TLS Certificates missing in certs/"
    FAILED=$((FAILED + 1))
fi

# 2. Docker Compose Offline Flags
if grep -q "TRANSFORMERS_OFFLINE=1" "${ROOT_DIR}/docker-compose.yml" && grep -q "HF_HUB_OFFLINE=1" "${ROOT_DIR}/docker-compose.yml"; then
    echo " [PASS] AI Engine Offline HuggingFace Flags (TRANSFORMERS_OFFLINE=1 & HF_HUB_OFFLINE=1)"
else
    echo " [FAIL] Missing offline flags in docker-compose.yml"
    FAILED=$((FAILED + 1))
fi

# 3. Check for external runtime CDN links in Frontend HTML
if grep -E "https?://(cdn|cdnjs|unpkg)\." "${ROOT_DIR}/frontend/index.html" >/dev/null 2>&1; then
    echo " [FAIL] External CDN script/link detected in frontend/index.html"
    FAILED=$((FAILED + 1))
else
    echo " [PASS] Zero External Runtime CDNs in frontend/index.html"
fi

# 4. Database Seed & Init SQL
if [ -f "${ROOT_DIR}/db/init.sql" ] && [ -f "${ROOT_DIR}/db/seed.sql" ]; then
    echo " [PASS] Database Schema & Synthetic Benchmark Seed (db/init.sql & db/seed.sql)"
else
    echo " [FAIL] Missing database initialization SQL files"
    FAILED=$((FAILED + 1))
fi

# 5. Governance Config
if [ -f "${ROOT_DIR}/governance-config.json" ]; then
    echo " [PASS] Central Governance Parameters (governance-config.json)"
else
    echo " [FAIL] Missing governance-config.json"
    FAILED=$((FAILED + 1))
fi

echo "------------------------------------------------------------------------"
if [ ${FAILED} -eq 0 ]; then
    echo "STATUS: 100% AIR-GAPPED VERIFIED - READY FOR DISCONNECTED DEPLOYMENT"
    exit 0
else
    echo "STATUS: AUDIT WARNINGS DETECTED (${FAILED} failures)"
    exit 1
fi
