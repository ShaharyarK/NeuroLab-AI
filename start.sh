#!/usr/bin/env bash

# ==============================================================================
#  🧬 NeuroLab AI - Development Starter Script (React + FastAPI)
# ==============================================================================
#  Starts both Backend (FastAPI on http://localhost:511)
#  and Frontend (React 18 + Vite on http://localhost:3000).
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# Configuration Defaults
MODE="both"           # "both", "backend", "frontend"
BACKEND_PORT=511
FRONTEND_PORT=3000
STOP=false

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_header()  { echo -e "${BOLD}${BLUE}$1${NC}"; }

print_banner() {
    echo -e "${CYAN}"
    echo "===================================================================="
    echo "          🧬 NeuroLab AI - Diagnostic System Launcher               "
    echo "===================================================================="
    echo -e "${NC}"
}

print_usage() {
    echo "Usage: ./start.sh [options]"
    echo ""
    echo "Options:"
    echo "  -b, --backend-only       Start only the FastAPI backend service (:511)"
    echo "  -f, --frontend-only      Start only the React Vite frontend (:3000)"
    echo "  -p, --port <number>      Backend port (default: 511)"
    echo "  --web-port <number>      Frontend port (default: 3000)"
    echo "  --stop                   Stop any running backend / frontend processes"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh               # Start both backend & frontend"
    echo "  ./start.sh -b            # Start backend only"
    echo "  ./start.sh -f            # Start frontend only"
    echo "  ./start.sh --stop        # Terminate running instances"
    echo ""
}

# Parse Command Line Arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--backend-only)
            MODE="backend"
            shift
            ;;
        -f|--frontend-only)
            MODE="frontend"
            shift
            ;;
        -p|--port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --web-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --stop)
            STOP=true
            shift
            ;;
        -h|--help)
            print_banner
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Find Python Binary
find_python() {
    if [ -x "${PROJECT_ROOT}/build_env/bin/python" ]; then
        echo "${PROJECT_ROOT}/build_env/bin/python"
        return 0
    fi
    if [ -x "${PROJECT_ROOT}/backend/venv/bin/python" ]; then
        echo "${PROJECT_ROOT}/backend/venv/bin/python"
        return 0
    fi
    if [ -x "${PROJECT_ROOT}/venv/bin/python" ]; then
        echo "${PROJECT_ROOT}/venv/bin/python"
        return 0
    fi
    if [ -n "$VIRTUAL_ENV" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
        echo "$VIRTUAL_ENV/bin/python"
        return 0
    fi
    if command -v python3 >/dev/null 2>&1; then
        echo "$(command -v python3)"
        return 0
    fi
    return 1
}

# Find Package Manager (pnpm, yarn, or npm)
find_pkg_manager() {
    if command -v pnpm >/dev/null 2>&1; then
        echo "pnpm"
        return 0
    fi
    if command -v yarn >/dev/null 2>&1; then
        echo "yarn"
        return 0
    fi
    if command -v npm >/dev/null 2>&1; then
        echo "npm"
        return 0
    fi
    return 1
}

# Check PIDs using a port
get_port_pids() {
    local port="$1"
    lsof -ti :"$port" 2>/dev/null || true
}

# Stop running instances
stop_services() {
    print_banner
    log_info "Stopping NeuroLab AI services..."
    local stopped=0

    # Stop backend PID if saved
    if [ -f "${PROJECT_ROOT}/.backend.pid" ]; then
        local b_pid
        b_pid=$(cat "${PROJECT_ROOT}/.backend.pid" 2>/dev/null || true)
        if [ -n "$b_pid" ] && kill -0 "$b_pid" 2>/dev/null; then
            log_info "Stopping backend process (PID: $b_pid)..."
            kill "$b_pid" 2>/dev/null || true
            stopped=1
        fi
        rm -f "${PROJECT_ROOT}/.backend.pid"
    fi

    # Stop frontend PID if saved
    if [ -f "${PROJECT_ROOT}/.frontend.pid" ]; then
        local f_pid
        f_pid=$(cat "${PROJECT_ROOT}/.frontend.pid" 2>/dev/null || true)
        if [ -n "$f_pid" ] && kill -0 "$f_pid" 2>/dev/null; then
            log_info "Stopping frontend process (PID: $f_pid)..."
            kill "$f_pid" 2>/dev/null || true
            stopped=1
        fi
        rm -f "${PROJECT_ROOT}/.frontend.pid"
    fi

    # Clear backend port 511
    local pids_b
    pids_b=$(get_port_pids "$BACKEND_PORT")
    if [ -n "$pids_b" ]; then
        for pid in $pids_b; do
            log_info "Releasing port $BACKEND_PORT from process PID: $pid..."
            kill -9 "$pid" 2>/dev/null || true
            stopped=1
        done
    fi

    # Clear frontend port 3000
    local pids_f
    pids_f=$(get_port_pids "$FRONTEND_PORT")
    if [ -n "$pids_f" ]; then
        for pid in $pids_f; do
            log_info "Releasing port $FRONTEND_PORT from process PID: $pid..."
            kill -9 "$pid" 2>/dev/null || true
            stopped=1
        done
    fi

    if [ $stopped -eq 1 ]; then
        log_success "All NeuroLab AI processes stopped."
    else
        log_info "No active NeuroLab AI processes detected."
    fi
    exit 0
}

# Handle --stop option
if [ "$STOP" = true ]; then
    stop_services
fi

# Track child PIDs for cleanup trap
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    trap - INT TERM EXIT
    echo ""
    log_info "Shutting down services..."

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_info "Terminating React frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        log_info "Terminating FastAPI backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
    fi

    # Ensure ports are clean
    local leftover_b
    leftover_b=$(get_port_pids "$BACKEND_PORT")
    if [ -n "$leftover_b" ]; then
        for pid in $leftover_b; do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi

    local leftover_f
    leftover_f=$(get_port_pids "$FRONTEND_PORT")
    if [ -n "$leftover_f" ]; then
        for pid in $leftover_f; do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi

    rm -f "${PROJECT_ROOT}/.backend.pid" "${PROJECT_ROOT}/.frontend.pid"
    log_success "NeuroLab AI shutdown complete."
}

# Register traps
trap cleanup INT TERM EXIT

print_banner

# ==============================================================================
# Environment Verification
# ==============================================================================
log_header "=== [1/3] Environment Verification ==="

# 1. Check Python
PYTHON_BIN=$(find_python || true)
if [ -z "$PYTHON_BIN" ]; then
    log_error "Python 3 could not be found."
    exit 1
fi
log_success "Python found: ${PYTHON_BIN}"

# 2. Check Package Manager
PKG_MGR=$(find_pkg_manager || true)
if [ -z "$PKG_MGR" ]; then
    log_error "No package manager (pnpm, yarn, npm) found for React frontend."
    exit 1
fi
log_success "Frontend manager found: ${PKG_MGR}"

# 3. Clear existing ports if occupied
OCCUPIED_PIDS=$(get_port_pids "$BACKEND_PORT")
if [ -n "$OCCUPIED_PIDS" ]; then
    log_warn "Port ${BACKEND_PORT} in use by PID(s): ${OCCUPIED_PIDS}. Releasing port..."
    for p in $OCCUPIED_PIDS; do
        kill -9 "$p" 2>/dev/null || true
    done
    sleep 1
fi

# ==============================================================================
# Backend Startup
# ==============================================================================
start_backend() {
    log_header "\n=== [2/3] Starting Backend Service ==="
    log_info "Directory: ${BACKEND_DIR}"
    log_info "Port: ${BACKEND_PORT}"
    
    cd "${BACKEND_DIR}"
    mkdir -p data static/reports

    export PORT="${BACKEND_PORT}"
    export PYTHONUNBUFFERED=1

    "${PYTHON_BIN}" main.py > "${PROJECT_ROOT}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "${PROJECT_ROOT}/.backend.pid"

    log_info "Backend launched (PID: ${BACKEND_PID})"
    log_info "Waiting for health check at http://127.0.0.1:${BACKEND_PORT}/docs..."

    local retries=60
    local ready=0
    while [ $retries -gt 0 ]; do
        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            log_error "Backend exited prematurely. Check backend.log:"
            tail -n 25 "${PROJECT_ROOT}/backend.log"
            exit 1
        fi

        if curl -s -o /dev/null -m 1 "http://127.0.0.1:${BACKEND_PORT}/docs" 2>/dev/null; then
            ready=1
            break
        fi

        sleep 1
        retries=$((retries - 1))
        printf "."
    done
    printf "\n"

    if [ $ready -eq 1 ]; then
        log_success "FastAPI Backend is online and ready!"
        echo -e "  - API Base URL:  ${BOLD}http://localhost:${BACKEND_PORT}${NC}"
        echo -e "  - Swagger Docs:  ${BOLD}http://localhost:${BACKEND_PORT}/docs${NC}"
        echo -e "  - Backend Logs:  ${PROJECT_ROOT}/backend.log"
    else
        log_error "Backend did not respond within 60 seconds."
        tail -n 25 "${PROJECT_ROOT}/backend.log"
        exit 1
    fi
}

# ==============================================================================
# Frontend Startup
# ==============================================================================
start_frontend() {
    log_header "\n=== [3/3] Starting React Frontend Application ==="
    log_info "Directory: ${FRONTEND_DIR}"
    log_info "Local URL: http://localhost:${FRONTEND_PORT}"

    cd "${FRONTEND_DIR}"

    echo ""
    log_success "NeuroLab AI is running! Open http://localhost:${FRONTEND_PORT} in your browser."
    log_info "Press [Ctrl+C] at any time to stop all services."
    echo "------------------------------------------------------------"

    if [ "$MODE" = "both" ]; then
        $PKG_MGR run dev &
        FRONTEND_PID=$!
        echo "$FRONTEND_PID" > "${PROJECT_ROOT}/.frontend.pid"
        wait "$FRONTEND_PID"
    else
        $PKG_MGR run dev
    fi
}

# ==============================================================================
# Execution Orchestration
# ==============================================================================
case "$MODE" in
    backend)
        start_backend
        echo ""
        log_info "Backend is running in standalone mode. Press [Ctrl+C] to exit."
        wait "$BACKEND_PID"
        ;;
    frontend)
        start_frontend
        ;;
    both)
        start_backend
        start_frontend
        ;;
esac
