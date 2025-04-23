#!/bin/bash

# Start the development server in the background
echo "Starting development server..."
./start-dev.sh &
SERVER_PID=$!

# Wait for the server to start
echo "Waiting for server to start..."
sleep 10

# Run the passkey tests
echo "Running passkey tests..."
npx cypress run --spec "cypress/e2e/passkey-registration.cy.js,cypress/e2e/simple-passkey.cy.js,cypress/e2e/simplified-auth-flow.cy.js"
TEST_RESULT=$?

# Stop the development server
echo "Stopping development server..."
kill $SERVER_PID

# Exit with the test result
exit $TEST_RESULT
