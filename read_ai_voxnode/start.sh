#!/bin/bash

# ============================================
# VoiceReader AI - Startup Script
# Linux/Mac Version
# ============================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=5000
FRONTEND_PORT=8000
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
VENV_DIR="$BACKEND_DIR/venv"
LOG_DIR="logs"
PID_FILE=".server_pids"

# Functions
print_header() {
    echo -e "\n${PURPLE}=========================================${NC}"
    echo -e "${PURPLE}    VoiceReader AI - Startup Script     ${NC}"
    echo -e "${PURPLE}=========================================${NC}\n"
}

print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 not found"
        echo "Please install Python 3.8 or higher from:"
        echo "https://www.python.org/downloads/"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    print_success "Python $PYTHON_VERSION found"
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_warning "pip3 not found, trying to install..."
        python3 -m ensurepip --upgrade
    fi
    
    # Check curl for health checks
    if ! command -v curl &> /dev/null; then
        print_warning "curl not found, some features may be limited"
    fi
}

create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKEND_DIR/uploads"
    
    print_success "Directories created"
}

setup_virtualenv() {
    print_status "Setting up Python virtual environment..."
    
    if [ ! -d "$VENV_DIR" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv "$VENV_DIR"
        
        if [ $? -ne 0 ]; then
            print_error "Failed to create virtual environment"
            exit 1
        fi
        print_success "Virtual environment created"
    else
        print_success "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip
    
    # Install requirements
    if [ -f "$BACKEND_DIR/requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip install -r "$BACKEND_DIR/requirements.txt"
        
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
        print_success "Dependencies installed"
    else
        print_error "requirements.txt not found in $BACKEND_DIR"
        exit 1
    fi
}

start_backend() {
    print_status "Starting backend server..."
    
    # Check if port is already in use
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $BACKEND_PORT is already in use"
        echo "Attempting to kill existing process..."
        lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
        sleep 2
    fi
    
    # Start backend in background
    cd "$BACKEND_DIR"
    nohup python server.py > "../$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Save PID
    echo "BACKEND=$BACKEND_PID" > "$PID_FILE"
    
    # Wait for backend to start
    print_status "Waiting for backend to start..."
    
    for i in {1..30}; do
        if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null; then
            print_success "Backend started successfully (PID: $BACKEND_PID)"
            echo "  → Backend URL: http://localhost:$BACKEND_PORT"
            echo "  → Health check: http://localhost:$BACKEND_PORT/api/health"
            echo "  → Logs: $LOG_DIR/backend.log"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    print_error "Backend failed to start"
    echo "Check logs: $LOG_DIR/backend.log"
    return 1
}

start_frontend() {
    print_status "Starting frontend server..."
    
    # Check if port is already in use
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $FRONTEND_PORT is already in use"
        echo "Using alternative port..."
        FRONTEND_PORT=$((FRONTEND_PORT + 1))
    fi
    
    # Start frontend server
    cd "$FRONTEND_DIR"
    nohup python -m http.server $FRONTEND_PORT > "../$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Save PID
    echo "FRONTEND=$FRONTEND_PID" >> "$PID_FILE"
    
    sleep 2
    
    print_success "Frontend started successfully (PID: $FRONTEND_PID)"
    echo "  → Frontend URL: http://localhost:$FRONTEND_PORT"
    echo "  → Direct file: file://$(pwd)/$FRONTEND_DIR/index.html"
    echo "  → Logs: $LOG_DIR/frontend.log"
}

open_browser() {
    print_status "Opening browser..."
    
    FRONTEND_URL="http://localhost:$FRONTEND_PORT"
    
    # Detect OS and open browser
    case "$(uname -s)" in
        Darwin)
            open "$FRONTEND_URL"
            ;;
        Linux)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$FRONTEND_URL"
            elif command -v gnome-open &> /dev/null; then
                gnome-open "$FRONTEND_URL"
            else
                echo "Please open manually: $FRONTEND_URL"
            fi
            ;;
        *)
            echo "Please open manually: $FRONTEND_URL"
            ;;
    esac
}

cleanup() {
    print_status "\nCleaning up..."
    
    if [ -f "$PID_FILE" ]; then
        # Read and kill saved PIDs
        while IFS='=' read -r key pid; do
            if [ ! -z "$pid" ]; then
                print_status "Stopping $key (PID: $pid)..."
                kill "$pid" 2>/dev/null
            fi
        done < "$PID_FILE"
        
        rm -f "$PID_FILE"
    fi
    
    # Deactivate virtual environment if active
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        deactivate
    fi
    
    print_success "Cleanup completed"
}

monitor_servers() {
    print_header
    echo -e "${CYAN}VoiceReader AI is now running!${NC}\n"
    
    echo -e "${YELLOW}=== SERVERS ===${NC}"
    echo "Backend:  http://localhost:$BACKEND_PORT"
    echo "Frontend: http://localhost:$FRONTEND_PORT"
    echo ""
    
    echo -e "${YELLOW}=== API ENDPOINTS ===${NC}"
    echo "Health:    http://localhost:$BACKEND_PORT/api/health"
    echo "Config:    http://localhost:$BACKEND_PORT/api/config"
    echo ""
    
    echo -e "${YELLOW}=== LOG FILES ===${NC}"
    echo "Backend:  $LOG_DIR/backend.log"
    echo "Frontend: $LOG_DIR/frontend.log"
    echo ""
    
    echo -e "${YELLOW}=== QUICK TESTS ===${NC}"
    echo "Test backend:   curl http://localhost:$BACKEND_PORT/api/health"
    echo "Open frontend:  Open the URL above in your browser"
    echo ""
    
    echo -e "${YELLOW}=== CONTROLS ===${NC}"
    echo "Press Ctrl+C to stop all servers"
    echo ""
    
    # Start monitoring loop
    while true; do
        # Check backend health every 10 seconds
        if ! curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null; then
            print_error "Backend server is down!"
            echo "Check logs: $LOG_DIR/backend.log"
        fi
        
        sleep 10
    done
}

# Main execution
main() {
    print_header
    
    # Set trap for cleanup on exit
    trap cleanup EXIT INT TERM
    
    # Step 1: Check dependencies
    check_dependencies
    
    # Step 2: Create directories
    create_directories
    
    # Step 3: Setup virtual environment
    setup_virtualenv
    
    # Step 4: Start backend
    if ! start_backend; then
        print_error "Failed to start backend. Exiting."
        exit 1
    fi
    
    # Step 5: Start frontend
    start_frontend
    
    # Step 6: Open browser (optional)
    read -p "Open browser automatically? [Y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        open_browser
    fi
    
    # Step 7: Monitor servers
    monitor_servers
}

# Run main function
main