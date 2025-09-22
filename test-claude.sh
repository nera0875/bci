#!/bin/bash

curl -X POST http://localhost:3001/api/test-chat \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "98f64fa2-1902-4870-a89a-08eaa21ba8d0",
    "message": "Hello Claude, are you working? Please respond with a brief test message."
  }' | jq