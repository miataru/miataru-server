#!/bin/bash

# DeleteLocation API Test Script
# This script demonstrates the DeleteLocation API functionality

SERVER_URL="http://localhost:8080"
DEVICE_ID="test-delete-device-$(date +%s)"

echo "=== DeleteLocation API Test ==="
echo "Server: $SERVER_URL"
echo "Test Device ID: $DEVICE_ID"
echo ""

# Step 1: Add some location data
echo "Step 1: Adding location data..."
curl -s -H 'Content-Type: application/json' -X POST "$SERVER_URL/v1/UpdateLocation" \
  -d "{
    \"MiataruConfig\": {
      \"EnableLocationHistory\": \"True\",
      \"LocationDataRetentionTime\": \"15\"
    },
    \"MiataruLocation\": [{
      \"Device\": \"$DEVICE_ID\",
      \"Timestamp\": \"$(date +%s)000\",
      \"Longitude\": \"10.837502\",
      \"Latitude\": \"49.828925\",
      \"HorizontalAccuracy\": \"50.00\"
    }]
  }" | jq '.'

echo ""

# Step 2: Verify location data exists
echo "Step 2: Verifying location data exists..."
curl -s -H 'Content-Type: application/json' -X POST "$SERVER_URL/v1/GetLocation" \
  -d "{
    \"MiataruGetLocation\": [{
      \"Device\": \"$DEVICE_ID\"
    }]
  }" | jq '.'

echo ""

# Step 3: Delete location data
echo "Step 3: Deleting location data..."
curl -s -H 'Content-Type: application/json' -X POST "$SERVER_URL/v1/DeleteLocation" \
  -d "{
    \"MiataruDeleteLocation\": {
      \"Device\": \"$DEVICE_ID\"
    }
  }" | jq '.'

echo ""

# Step 4: Verify data is deleted
echo "Step 4: Verifying data is deleted..."
curl -s -H 'Content-Type: application/json' -X POST "$SERVER_URL/v1/GetLocation" \
  -d "{
    \"MiataruGetLocation\": [{
      \"Device\": \"$DEVICE_ID\"
    }]
  }" | jq '.'

echo ""

# Step 5: Test deleting non-existent device
echo "Step 5: Testing deletion of non-existent device..."
curl -s -H 'Content-Type: application/json' -X POST "$SERVER_URL/v1/DeleteLocation" \
  -d "{
    \"MiataruDeleteLocation\": {
      \"Device\": \"non-existent-device\"
    }
  }" | jq '.'

echo ""
echo "=== Test Complete ==="
