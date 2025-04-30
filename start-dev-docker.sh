#!/bin/bash

# Start the Docker-based development environment
echo "Starting Docker-based development environment..."

# Check if nodemon is installed in the server container
docker-compose -f docker-compose.dev.yml run --rm server sh -c "npm list -g nodemon || npm install -g nodemon"

# Start the services
docker-compose -f docker-compose.dev.yml up -d

echo "Docker-based development environment started!"
echo "Access the application at:"
echo "  - http://localhost:3000 (Frontend)"
echo "  - http://localhost:5000/api (API)"
echo ""
echo "Hot reloading is enabled - changes to files will be automatically detected"
echo "Press Ctrl+C to view logs in real-time"

# Option to view logs
read -p "Do you want to view logs? (y/n): " view_logs
if [[ $view_logs == "y" || $view_logs == "Y" ]]; then
  docker-compose -f docker-compose.dev.yml logs -f
fi
