#!/bin/bash

# Stop the Docker-based development environment
echo "Stopping Docker-based development environment..."

# Stop the services and remove orphaned containers
docker-compose -f docker-compose.dev.yml down --remove-orphans

echo "Docker-based development environment stopped successfully!"
