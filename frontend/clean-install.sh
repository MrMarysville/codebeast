#!/bin/bash

# Clean up node_modules and package-lock.json
echo "Cleaning up node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo "Starting the application..."
npm start 