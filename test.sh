#!/bin/bash
# APIの自動テスト。サーバーを起動し、curlでエンドポイントを叩いて期待値と比較する。
# 新しいエンドポイントを追加したら、この下に assert_eq を増やしていく。
set -u

BASE_URL="http://localhost:3002"
PASS=0
FAIL=0

lsof -ti:3002 | xargs -r kill -9 2>/dev/null
sleep 0.5

# Claude Code が無い状態で起動し、AI を呼ばずに確かめられる範囲をテストする
CLAUDE_BIN=/nonexistent/claude node index.js > /tmp/${PWD##*/}_test_server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null
}
trap cleanup EXIT

sleep 1

assert_eq() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" == "$actual" ]; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name (expected: $expected, actual: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# --- GET / （画面） ---
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
status=$(echo "$res" | tail -n 1)
body=$(echo "$res" | sed '$d')
assert_eq "GET / status" "200" "$status"
assert_eq "GET / title" "1" "$(echo "$body" | grep -c '<title>VANG SELECT Post draft</title>')"

# --- ロゴ ---
res=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/logo.png")
assert_eq "GET /assets/logo.png status" "200" "$res"

# --- GET /api/config ---
body=$(curl -s "$BASE_URL/api/config")
assert_eq "GET /api/config available" "false" "$(echo "$body" | jq -c .available)"
assert_eq "GET /api/config labels" '["ジャンル","ターゲット","紹介したい商品・サービス","口調"]' "$(echo "$body" | jq -c '[.variables[].label]')"
assert_eq "GET /api/config placeholder" '{ターゲット（具体的な悩みを抱えた層）}' "$(echo "$body" | jq -r '.variables[1].placeholder')"

FILLED='{"genre":"美容","target":"毛穴に悩む20代","product":"$1 クレンジング","tone":"女子のタメ口"}'

# --- POST /api/prompt ---
res=$(curl -s -w "\n%{http_code}" -H "Content-Type: application/json" -d "$FILLED" "$BASE_URL/api/prompt")
status=$(echo "$res" | tail -n 1)
prompt=$(echo "$res" | sed '$d' | jq -r .prompt)
assert_eq "POST /api/prompt status" "200" "$status"
assert_eq "POST /api/prompt 変数" "1" "$(echo "$prompt" | grep -c '^- 紹介したい商品・サービス：\$1 クレンジング$')"
assert_eq "POST /api/prompt 口調" "1" "$(echo "$prompt" | grep -c '口調は「女子のタメ口」を厳守')"
assert_eq "POST /api/prompt {} が残らない" "0" "$(echo "$prompt" | grep -c '{ジャンル}\|{口調}')"

res=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d '{"genre":"{ジャンル}","target":"a","product":"b","tone":"c"}' "$BASE_URL/api/prompt")
assert_eq "POST /api/prompt 初期文字のまま → 400" "400" "$res"

# --- POST /api/posts ---
body=$(curl -s -H "Content-Type: application/json" -d '{"genre":"美容"}' "$BASE_URL/api/posts")
assert_eq "POST /api/posts 未入力" '"未入力の項目があります：ターゲット、紹介したい商品・サービス、口調"' "$(echo "$body" | jq -c .error)"
res=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d "$FILLED" "$BASE_URL/api/posts")
assert_eq "POST /api/posts Claude Code 無し → 503" "503" "$res"

# --- POST /api/trends ---
res=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d '{"category":"家電","season":true}' "$BASE_URL/api/trends")
assert_eq "POST /api/trends Claude Code 無し → 503" "503" "$res"

# --- 存在しないルート ---
res=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/not-found")
assert_eq "GET /not-found status" "404" "$res"

echo ""
echo "結果: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
