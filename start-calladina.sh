#!/bin/bash

# 🤖 Calladina AI Voice Agent - Startup Script
# This script starts your complete AI voice receptionist system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i :"$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to start..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        printf "${CYAN}."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo ""
    print_error "$service_name failed to start within 30 seconds"
    return 1
}

# Function to display help
show_help() {
    echo -e "${PURPLE}🤖 Calladina AI Voice Agent - Startup Script${NC}"
    echo ""
    echo "Usage: ./start-calladina.sh [MODE]"
    echo ""
    echo "Modes:"
    echo "  dev      - Start in development mode (default)"
    echo "  prod     - Start in production mode"
    echo "  ngrok    - Start with ngrok deployment"
    echo "  backend  - Start backend only"
    echo "  frontend - Start frontend only"
    echo "  install  - Install all dependencies"
    echo "  health   - Check system health"
    echo "  stop     - Stop all services"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start-calladina.sh           # Start in dev mode"
    echo "  ./start-calladina.sh ngrok     # Start with ngrok for phone calls"
    echo "  ./start-calladina.sh install   # Install dependencies"
    echo "  ./start-calladina.sh health    # Check if services are running"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "🔍 Checking Prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version)
    print_success "Node.js: $node_version"
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    local npm_version=$(npm --version)
    print_success "npm: v$npm_version"
    
    # Check if directories exist
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found!"
        exit 1
    fi
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found!"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Function to install dependencies
install_dependencies() {
    print_header "📦 Installing Dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    
    print_success "All dependencies installed!"
}

# Function to check environment variables
check_environment() {
    print_header "🔧 Checking Environment Configuration..."
    
    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env file not found!"
        print_status "Creating .env file from template..."
        
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            print_warning "Please edit backend/.env with your API keys!"
        else
            print_error "No .env.example file found!"
            exit 1
        fi
    fi
    
    # Check critical environment variables
    cd backend
    if [ -f ".env" ]; then
        source .env
        
        if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
            print_success "OpenAI API Key: Configured"
        else
            print_warning "OpenAI API Key: Not configured"
        fi
        
        if [ -n "$ELEVENLABS_API_KEY" ] && [ "$ELEVENLABS_API_KEY" != "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
            print_success "ElevenLabs API Key: Configured"
        else
            print_warning "ElevenLabs API Key: Not configured"
        fi
        
        if [ -n "$TWILIO_ACCOUNT_SID" ] && [ "$TWILIO_ACCOUNT_SID" != "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
            print_success "Twilio Account SID: Configured"
        else
            print_warning "Twilio Account SID: Not configured"
        fi
    fi
    cd ..
}

# Function to stop services
stop_services() {
    print_header "🛑 Stopping Calladina Services..."
    
    # Kill processes on ports 3000 and 3001
    if port_in_use 3000; then
        print_status "Stopping frontend (port 3000)..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    fi
    
    if port_in_use 3001; then
        print_status "Stopping backend (port 3001)..."
        lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    fi
    
    # Kill any remaining node/npm processes related to calladina
    pkill -f "calladina" 2>/dev/null || true
    pkill -f "nodemon.*server.js" 2>/dev/null || true
    
    print_success "All services stopped!"
}

# Function to check health
check_health() {
    print_header "🏥 System Health Check..."
    
    # Check if ports are in use
    if port_in_use 3001; then
        print_status "Testing backend API..."
        if curl -s http://localhost:3001/api/health >/dev/null; then
            local health_response=$(curl -s http://localhost:3001/api/health)
            print_success "Backend API: Healthy"
            echo "  Response: $health_response"
        else
            print_warning "Backend API: Running but not responding"
        fi
    else
        print_warning "Backend: Not running (port 3001)"
    fi
    
    if port_in_use 3000; then
        print_success "Frontend: Running (port 3000)"
        print_status "Access at: http://localhost:3000"
    else
        print_warning "Frontend: Not running (port 3000)"
    fi
}

# Function to start backend only
start_backend() {
    print_header "🔧 Starting Backend Only..."
    
    if port_in_use 3001; then
        print_warning "Port 3001 is already in use. Stopping existing service..."
        lsof -ti :3001 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    print_status "Starting AI Voice Agent backend..."
    cd backend
    npm run dev &
    cd ..
    
    wait_for_service "http://localhost:3001/api/health" "Backend API"
    print_success "Backend started successfully!"
    print_status "API available at: http://localhost:3001"
}

# Function to start frontend only
start_frontend() {
    print_header "🌐 Starting Frontend Only..."
    
    if port_in_use 3000; then
        print_warning "Port 3000 is already in use. Stopping existing service..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    print_status "Starting React frontend..."
    cd frontend
    npm start &
    cd ..
    
    wait_for_service "http://localhost:3000" "Frontend"
    print_success "Frontend started successfully!"
    print_status "Web interface available at: http://localhost:3000"
}

# Function to start in development mode
start_dev() {
    print_header "🚀 Starting Calladina AI Voice Agent (Development Mode)"
    
    # Stop any existing services
    if port_in_use 3000 || port_in_use 3001; then
        print_status "Stopping existing services..."
        stop_services
        sleep 2
    fi
    
    print_status "Starting both frontend and backend..."
    npm run dev &
    
    # Wait for both services
    wait_for_service "http://localhost:3001/api/health" "Backend API"
    wait_for_service "http://localhost:3000" "Frontend"
    
    print_success "🎉 Calladina AI Voice Agent is running!"
    echo ""
    print_status "📱 Web Interface: http://localhost:3000"
    print_status "🔧 Backend API: http://localhost:3001"
    print_status "📊 Health Check: http://localhost:3001/api/health"
    echo ""
    print_status "🧠 To train your AI agent, go to: http://localhost:3000 → AI Training tab"
    print_status "📞 To enable phone calls, run: ./start-calladina.sh ngrok"
    echo ""
    print_warning "Keep this terminal open to maintain the services!"
}

# Function to start with ngrok
start_ngrok() {
    print_header "🌐 Starting with Ngrok Deployment..."
    
    # Start services first if not running
    if ! port_in_use 3001; then
        print_status "Backend not running, starting it first..."
        start_backend
    fi
    
    if ! port_in_use 3000; then
        print_status "Frontend not running, starting it first..."
        start_frontend &
    fi
    
    print_status "Starting ngrok deployment..."
    cd backend
    node deploy.js
}

# Main script logic
case "${1:-dev}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "install")
        check_prerequisites
        install_dependencies
        ;;
    "backend")
        check_prerequisites
        check_environment
        start_backend
        echo ""
        print_status "Press Ctrl+C to stop the backend"
        wait
        ;;
    "frontend")
        check_prerequisites
        start_frontend
        echo ""
        print_status "Press Ctrl+C to stop the frontend"
        wait
        ;;
    "dev")
        check_prerequisites
        check_environment
        start_dev
        echo ""
        print_status "Press Ctrl+C to stop all services"
        wait
        ;;
    "prod")
        check_prerequisites
        check_environment
        print_header "🚀 Starting in Production Mode..."
        npm run start
        ;;
    "ngrok")
        check_prerequisites
        check_environment
        start_ngrok
        ;;
    "health")
        check_health
        ;;
    "stop")
        stop_services
        ;;
    *)
        print_error "Unknown mode: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 