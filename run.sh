#!/usr/bin/env bash
# ==============================================================================
# AICTE SAMANVAY (समन्वय) - Platform Launcher for Linux / macOS
# Air-Gapped Cross-Bureau Grievance Harmonization Framework
# ==============================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    fi
fi

check_prereqs() {
    echo -e "${CYAN}[1/3] Checking environment configuration...${NC}"
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}[INFO] .env not found. Creating default .env from .env.example...${NC}"
            cp ".env.example" ".env"
            echo -e "${GREEN}[OK] Created .env successfully.${NC}"
        else
            echo -e "${YELLOW}[WARNING] .env.example not found.${NC}"
        fi
    else
        echo -e "${GREEN}[OK] Environment file (.env) is present.${NC}"
    fi

    echo -e "${CYAN}[2/3] Checking Docker installation...${NC}"
    if [ -z "$COMPOSE_CMD" ]; then
        echo -e "${RED}[ERROR] Neither 'docker compose' nor 'docker-compose' found.${NC}"
        echo "Please install Docker Desktop or Docker Engine: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo -e "${GREEN}[OK] Docker is installed ($COMPOSE_CMD).${NC}"

    echo -e "${CYAN}[3/3] Checking TLS certificates...${NC}"
    if [ ! -f "certs/samanvay.crt" ] || [ ! -f "certs/samanvay.key" ]; then
        echo -e "${YELLOW}[INFO] TLS certificates not found. Generating air-gapped self-signed certificate...${NC}"
        mkdir -p certs
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout certs/samanvay.key -out certs/samanvay.crt \
            -subj "/C=IN/ST=Delhi/L=New Delhi/O=AICTE/OU=Samanvay Bureau/CN=localhost" \
            >/dev/null 2>&1 || true
        echo -e "${GREEN}[OK] Generated certs/samanvay.crt and certs/samanvay.key.${NC}"
    else
        echo -e "${GREEN}[OK] Local TLS certificates present.${NC}"
    fi
}

start_background() {
    check_prereqs
    echo -e "\n${BLUE}========================================================================${NC}"
    echo -e "${BLUE}  Starting AICTE Samanvay Services in Background...${NC}"
    echo -e "${BLUE}========================================================================${NC}"
    $COMPOSE_CMD up -d

    echo -e "\n${CYAN}Waiting for services to become healthy...${NC}"
    sleep 5
    $COMPOSE_CMD ps

    echo -e "\n${GREEN}========================================================================${NC}"
    echo -e "${GREEN}  AICTE SAMANVAY PLATFORM IS READY${NC}"
    echo -e "${GREEN}========================================================================${NC}"
    echo -e " Web Interface (Nginx):    ${CYAN}https://localhost${NC} (or http://localhost)"
    echo -e " Backend API:              ${CYAN}http://localhost:8080/api${NC}"
    echo -e " AI Engine (FastAPI):      ${CYAN}http://localhost:8000/docs${NC}"
    echo -e " Public Grievance Tracker: ${CYAN}https://localhost (Click Track Grievance)${NC}"
    echo -e " SMS/Email Simulator:      ${CYAN}https://localhost (Bell Menu -> Simulator)${NC}"
    echo -e "========================================================================\n"
}

start_foreground() {
    check_prereqs
    echo -e "\n${BLUE}========================================================================${NC}"
    echo -e "${BLUE}  Launching AICTE Samanvay Services (Press Ctrl+C to terminate)...${NC}"
    echo -e "${BLUE}========================================================================${NC}"
    $COMPOSE_CMD up
}

stop_services() {
    check_prereqs
    echo -e "\n${YELLOW}Stopping AICTE Samanvay Services...${NC}"
    $COMPOSE_CMD down
    echo -e "${GREEN}[OK] All services stopped.${NC}"
}

view_logs() {
    check_prereqs
    $COMPOSE_CMD logs -f --tail=100
}

rebuild_services() {
    check_prereqs
    echo -e "\n${CYAN}Rebuilding Container Images and Restarting...${NC}"
    $COMPOSE_CMD up -d --build
    $COMPOSE_CMD ps
}

start_frontend_dev() {
    echo -e "\n${BLUE}Starting Frontend Development Server...${NC}"
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev
}

run_health_check() {
    if command -v python3 >/dev/null 2>&1; then
        python3 scripts/health_check.py
    elif command -v python >/dev/null 2>&1; then
        python scripts/health_check.py
    else
        echo -e "${RED}[ERROR] Python 3 not found to execute scripts/health_check.py${NC}"
        exit 1
    fi
}

show_menu() {
    clear
    echo -e "${BLUE}========================================================================${NC}"
    echo -e "${BLUE}           AICTE SAMANVAY (समन्वय) PLATFORM LAUNCHER${NC}"
    echo -e "${BLUE}     Air-Gapped Cross-Bureau Grievance & Regulatory Framework${NC}"
    echo -e "${BLUE}========================================================================${NC}\n"
    echo -e "  [1] Start All Services (Background / Detached)"
    echo -e "  [2] Start All Services (Foreground with Live Streaming Logs)"
    echo -e "  [3] Stop All Services (Clean Shutdown)"
    echo -e "  [4] View Live Streaming Logs"
    echo -e "  [5] Rebuild and Restart All Services"
    echo -e "  [6] Start Frontend Only (Local Dev: npm run dev)"
    echo -e "  [7] Run Air-Gapped Health & Verification Check"
    echo -e "  [8] View Service Status (docker compose ps)"
    echo -e "  [9] Exit\n"
    echo -e "${BLUE}========================================================================${NC}"
    read -rp "Select an option [1-9] (Default: 1): " choice
    choice="${choice:-1}"

    case "$choice" in
        1) start_background ;;
        2) start_foreground ;;
        3) stop_services ;;
        4) view_logs ;;
        5) rebuild_services ;;
        6) start_frontend_dev ;;
        7) run_health_check ;;
        8) $COMPOSE_CMD ps ;;
        9) exit 0 ;;
        *) echo "Invalid option." ; sleep 1 ; show_menu ;;
    esac
}

# CLI Argument dispatcher
case "$1" in
    start|up) start_background ;;
    fg|foreground) start_foreground ;;
    stop|down) stop_services ;;
    logs) view_logs ;;
    rebuild) rebuild_services ;;
    dev) start_frontend_dev ;;
    health) run_health_check ;;
    status|ps) $COMPOSE_CMD ps ;;
    *) show_menu ;;
esac
