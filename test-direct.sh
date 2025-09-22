#!/bin/bash

curl -X POST http://localhost:3001/api/test-claude-direct \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Claude! The BCI tool is being fixed. Can you respond to confirm you are working?"}' | jq