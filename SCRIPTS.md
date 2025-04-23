# Development Scripts

This document explains the various scripts available for development.

### Standard Development (Recommended)

These scripts run the application directly on your host machine without Docker, providing the fastest development experience:

- `./start-dev.sh` - Starts the development environment (React frontend + Node.js backend)
- `./stop-dev.sh` - Stops the development environment

Access the application at:
- Frontend: http://localhost:3000
- API: http://localhost:5000/api

### Docker-based Development

These scripts run the application using Docker containers, which provides an environment closer to production:

- `./start-dev-docker.sh` - Starts the Docker-based development environment with Nginx
- `./stop-dev-docker.sh` - Stops the Docker-based development environment

Access the application at:
- Main: http://localhost (via Nginx)
- Frontend (direct): http://localhost:3000
- API (direct): http://localhost:5000/api

## When to Use Each Script

- **Standard Development**: Use for day-to-day development and testing. This provides the fastest feedback loop and hot reloading.
- **Docker-based Development**: Use when you need to test with Nginx or when you want to ensure your changes work in a containerized environment.
