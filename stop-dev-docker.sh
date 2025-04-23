#!/bin/bash

# Stop the Docker-based development environment
echo "Stopping Docker-based development environment..."

# Stop the services
docker-compose -f docker-compose.dev.yml down

echo "Docker-based development environment stopped successfully!"
