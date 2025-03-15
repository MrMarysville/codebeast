#!/bin/bash

# Colors for terminal output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}${CYAN}=====================================${NC}"
echo -e "${BOLD}${CYAN}  Hybrid Encoding System Launcher    ${NC}"
echo -e "${BOLD}${CYAN}=====================================${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is required but not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Ensure all dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (this may take a few minutes)...${NC}"
    npm run install:all
    echo -e "${GREEN}Dependencies installed successfully.${NC}\n"
else
    echo -e "${GREEN}Dependencies already installed.${NC}\n"
fi

# Start the application using our robust script
echo -e "${BOLD}${GREEN}Starting the application...${NC}"
node start-app.js 