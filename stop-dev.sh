#!/bin/bash

# Stop the development environment (without Docker)
echo "Stopping development environment..."

# Find and kill the Node.js processes
pkill -f "node.*server/index.js" || true
pkill -f "react-scripts start" || true

echo "Development environment stopped successfully!"
