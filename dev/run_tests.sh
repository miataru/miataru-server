#!/bin/bash

# Run unit tests
echo "Running unit tests..."
npm run test

echo ""
echo "Running integration tests..."
npm run test:integration

echo ""
echo "All tests completed!"
