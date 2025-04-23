# Authelia Authentication Setup for Memorize Tool

This directory contains the configuration files for setting up Authelia as an authentication and authorization server for the Memorize Tool application.

## Overview

Authelia is a Single Sign-On Multi-Factor portal for web applications. It provides:

- Single sign-on (SSO) for your applications
- Two-factor authentication (2FA) with various methods:
  - WebAuthn/Passkey (FIDO2) support
  - Time-based One-Time Password (TOTP)
  - Mobile push notifications via Duo
- Access control rules based on user identity and context
- User management

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- A domain name (for production)
- SSL certificates (for production)

### Development Setup

1. Update your hosts file to include the following entries:
   ```
   127.0.0.1 auth.example.com
   127.0.0.1 memorize-tool.example.com
   ```

2. Start all services using the provided script:
   ```bash
   ./start.sh
   ```

   This will start the following Docker containers:
   - Authelia (authentication server)
   - Nginx (reverse proxy)
   - Frontend (React application)
   - Server (Node.js backend)

3. Access the Authelia portal at https://auth.example.com
   - Default credentials:
     - Username: john
     - Password: password

4. Access the Memorize Tool application at https://memorize-tool.example.com
   - You will be redirected to the Authelia login page

### Production Setup

For production deployment, you should:

1. Replace the example domain names with your actual domain names
2. Configure proper SSL certificates
3. Use a more secure user database (LDAP or a proper SQL database)
4. Configure proper email notifications
5. Set secure secrets for session and JWT tokens

## Configuration Files

- `docker-compose.yml`: Docker Compose configuration for Authelia and Nginx
- `authelia/configuration.yml`: Main Authelia configuration
- `authelia/users_database.yml`: User database for file-based authentication
- `nginx/nginx.conf`: Main Nginx configuration
- `nginx/conf.d/authelia.conf`: Nginx configuration for Authelia portal
- `nginx/conf.d/app.conf`: Nginx configuration for the Memorize Tool application
- `nginx/snippets/authelia.conf`: Authelia authentication snippet for Nginx

## Passkey Authentication

Authelia supports WebAuthn/Passkey authentication, which allows users to register and authenticate using biometric authentication (fingerprint, face recognition) or security keys.

To enable Passkey login:

1. Log in to Authelia using username/password
2. Go to your profile settings
3. Register a new WebAuthn device
4. You can now use your Passkey for future logins

## Security Considerations

- In production, always use HTTPS
- Set strong, unique secrets for all sensitive configuration values
- Regularly update Authelia and all dependencies
- Consider using a hardware security module (HSM) for storing cryptographic keys
- Implement proper backup and recovery procedures for the authentication database
