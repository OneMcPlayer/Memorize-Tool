#!/bin/bash

# Start the development environment (without Docker)
echo "Starting development environment..."

# Run the development script that starts both frontend and backend
npm run dev

echo "Development environment started!"
echo "Access the application at:"
echo "  - http://localhost:3000 (Frontend)"
echo "  - http://localhost:5000/api (API)"
echo ""
echo "Hot reloading is enabled - changes to files will be automatically detected"
