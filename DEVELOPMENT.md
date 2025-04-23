# Development Guide for Memorize Tool

This guide explains how to set up and use the development environment for the Memorize Tool application.

## Development Environment

The development environment uses Docker to provide a consistent development experience across different machines. It includes:

- **Hot reloading** for the React frontend
- **Auto-restart** for the Node.js backend
- **Volume mounts** for immediate code updates
- **HTTPS support** with self-signed certificates

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned

### Starting the Development Environment

1. Run the development start script:

```bash
./start-dev.sh
```

This will:
- Start all services in development mode
- Set up hot reloading for the React frontend
- Configure auto-restart for the Node.js backend
- Mount your local code directories into the containers

2. Access the application:

- Frontend: https://localhost:8443
- API: http://localhost:5000/api

### Stopping the Development Environment

To stop the development environment:

```bash
./stop-dev.sh
```

## How Development Mode Works

### Code Updates

In development mode, your local code directories are mounted into the Docker containers:

- Changes to React code are immediately reflected thanks to React's hot module replacement
- Changes to Node.js code trigger an automatic server restart thanks to nodemon
- Changes to static files are immediately available

### Containers

The development environment uses three containers:

1. **frontend-dev**: Runs the React development server with hot reloading
2. **server-dev**: Runs the Node.js backend with nodemon for auto-restart
3. **nginx-dev**: Routes requests between the frontend and backend

### Ports

- **3000**: React development server (internal)
- **5000**: Node.js API server
- **80/443**: HTTP/HTTPS (redirects to HTTPS)
- **8080/8443**: Alternative HTTP/HTTPS ports

## Troubleshooting

### Hot Reloading Not Working

If hot reloading stops working:

1. Check the frontend container logs:
   ```bash
   docker logs frontend-dev
   ```

2. Restart the development environment:
   ```bash
   ./stop-dev.sh && ./start-dev.sh
   ```

### Backend Changes Not Reflected

If changes to the backend code are not being detected:

1. Check the server container logs:
   ```bash
   docker logs server-dev
   ```

2. Manually restart the server container:
   ```bash
   docker restart server-dev
   ```

### Viewing Logs

To view logs from all containers:

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

To view logs from a specific container:

```bash
docker logs -f [container-name]
```

## Best Practices

1. **Use the development environment for all development work**
   - This ensures consistency across all developers

2. **Commit package.json changes**
   - If you add new dependencies, make sure to commit the updated package.json

3. **Test in production mode before deploying**
   - The development environment may behave differently from production
