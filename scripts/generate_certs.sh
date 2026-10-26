#!/bin/bash
# AICTE Samanvay - Self-Signed TLS Certificate Generator for Nginx Gateway
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUTPUT_DIR="${DIR}/../certs"
DOMAIN="localhost"

mkdir -p "${OUTPUT_DIR}"

echo "[TLS] Generating self-signed X.509 certificate for ${DOMAIN}..."
openssl req -x509 -nodes -days 1825 -newkey rsa:2048 \
    -keyout "${OUTPUT_DIR}/samanvay.key" \
    -out "${OUTPUT_DIR}/samanvay.crt" \
    -subj "/CN=${DOMAIN}/O=AICTE Samanvay/C=IN" \
    -addext "subjectAltName=DNS:${DOMAIN},IP:127.0.0.1,DNS:samanvay.aicte.gov.in"

echo "[TLS] Certificate generated:"
echo "      Certificate: ${OUTPUT_DIR}/samanvay.crt"
echo "      Private Key: ${OUTPUT_DIR}/samanvay.key"
