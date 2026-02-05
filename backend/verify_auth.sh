#!/bin/bash
BASE_URL="http://localhost:8787"

echo "1. Testing /api/setup (Create Super Admin)"
SETUP_RES=$(curl -s -X POST "$BASE_URL/api/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com", "password":"password123", "name":"Super Admin"}')
echo "Response: $SETUP_RES"

echo -e "\n2. Testing /api/login (As Super Admin)"
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com", "password":"password123"}')
echo "Response: $LOGIN_RES"

TOKEN=$(echo $LOGIN_RES | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token. Exiting."
  exit 1
fi

echo -e "\nToken received: $TOKEN"

echo -e "\n3. Testing /api/users (Create new User)"
CREATE_USER_RES=$(curl -s -X POST "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123", "name":"Normal User", "role":"USER"}')
echo "Response: $CREATE_USER_RES"

echo -e "\n4. Testing /api/login (As Normal User)"
USER_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123"}')
echo "Response: $USER_LOGIN_RES"

USER_TOKEN=$(echo $USER_LOGIN_RES | jq -r '.token')

echo -e "\n5. Testing /api/users (Fail as Normal User)"
FAIL_CREATE_RES=$(curl -s -X POST "$BASE_URL/api/users" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"fail@test.com", "password":"password123", "name":"Fail User"}')
echo "Response: $FAIL_CREATE_RES"

echo -e "\n6. Testing /api/register (Should not exist or fail)"
REGISTER_RES=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"public@test.com", "password":"password123", "name":"Public User"}')
echo "Response: $REGISTER_RES"
