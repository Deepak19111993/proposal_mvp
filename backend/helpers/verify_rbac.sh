#!/bin/bash
BASE_URL="http://localhost:8787"

# 1. Login as Super Admin
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com", "password":"password123"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')
echo "Admin Token: $ADMIN_TOKEN"

# 2. Login as Normal User
USER_LOGIN=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123"}')
USER_TOKEN=$(echo $USER_LOGIN | jq -r '.token')
echo "User Token: $USER_TOKEN"

# 3. Create a dummy history item (mocking by hitting generate, assuming it creates one, or we just try to delete a random ID)
# Since we don't have an easy "create history" API without chat, we'll try to delete a non-existent ID. 
# The RBAC check happens BEFORE the "not found" check usually, or at least we expect 403 vs 404/200.
# Wait, look at history.ts: verify ownership/existence might happen. 
# BUT my code added the role check at the very top of delete. So it should be 403 immediately.

echo -e "\n1. Testing Delete History as USER (Should be 403)"
USER_DEL_RES=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/history/some-random-id" \
  -H "Authorization: Bearer $USER_TOKEN")
echo "Status Code: $USER_DEL_RES"

if [ "$USER_DEL_RES" == "403" ]; then
    echo "PASS: User forbidden"
else
    echo "FAIL: User not forbidden"
fi

echo -e "\n2. Testing Delete History as ADMIN (Should be 200 or 404/500 but NOT 403)"
# It might be 200 (if success) or 500 (if db error) or 200 (if delete logic is permissive). 
# My code: db.delete().where(...) -> returns {success:true} even if nothing deleted? Drizzle behavior.
ADMIN_DEL_RES=$(curl -s -X DELETE "$BASE_URL/api/history/some-random-id" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Response: $ADMIN_DEL_RES"
# If response is not forbidden, we consider pass for RBAC check.

echo -e "\n3. Testing Delete Resume as USER (Should be 403)"
USER_RES_DEL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/resume/some-id" \
  -H "Authorization: Bearer $USER_TOKEN")
echo "Status Code: $USER_RES_DEL"

if [ "$USER_RES_DEL" == "403" ]; then
    echo "PASS: User forbidden"
else
    echo "FAIL: User not forbidden"
fi

echo -e "\n5. Testing Generate Resume as USER (Should be 403)"
USER_GEN_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/resume/generate" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"Dev", "description":"Test"}')
echo "Status Code: $USER_GEN_RES"

if [ "$USER_GEN_RES" == "403" ]; then
    echo "PASS: User forbidden"
else
    echo "FAIL: User not forbidden"
fi

echo -e "\n6. Testing Generate Resume as ADMIN (Should be 200/500 but NOT 403)"
# Will probably fail due to API key or missing body if not careful, but we check for != 403
# Actually we provided body.
ADMIN_GEN_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/resume/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"Dev", "description":"Test"}')
echo "Status Code: $ADMIN_GEN_RES"
