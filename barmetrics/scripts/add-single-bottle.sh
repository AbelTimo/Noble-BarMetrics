#!/bin/bash

# Script to add a single bottle to the database via API
# Usage: ./scripts/add-single-bottle.sh

# Example: Adding a custom bottle
curl -X POST http://localhost:3000/api/bottle-weights \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Your Custom Brand",
    "productName": "Custom Vodka",
    "category": "VODKA",
    "sizeMl": 750,
    "tareWeightG": 500,
    "abvPercent": 40,
    "bottleType": "Standard Glass",
    "notes": "Custom bottle added manually"
  }'

echo ""
echo "Bottle added! Check the database with:"
echo "curl http://localhost:3000/api/bottle-weights?search=Custom"
