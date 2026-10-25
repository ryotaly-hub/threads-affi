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

# --- アイコン ---
res=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/icons/apple-touch-icon.png")
assert_eq "GET /icons/apple-touch-icon.png status" "200" "$res"
assert_eq "GET /manifest.webmanifest short_name" "VANG SELECT" "$(curl -s "$BASE_URL/manifest.webmanifest" | jq -r .short_name)"

# --- GET /api/config ---
body=$(curl -s "$BASE_URL/api/config")
assert_eq "GET /api/config available" "false" "$(echo "$body" | jq -c .available)"
assert_eq "GET /api/config labels" '["ジャンル","ターゲット","紹介したい商品・サービス","口調"]' "$(echo "$body" | jq -c '[.variables[].label]')"
assert_eq "GET /api/config 口調は10パターン" "10" "$(echo "$body" | jq '.variables[3].options | length')"
assert_eq "GET /api/config 口調1" "親しみやすいお姉さん系" "$(echo "$body" | jq -r '.variables[3].options[0].name')"
assert_eq "GET /api/config placeholder" 'ターゲット（具体的な悩みを抱えた層）' "$(echo "$body" | jq -r '.variables[1].placeholder')"

FILLED='{"genre":"美容","target":"毛穴に悩む20代","product":"$1 クレンジング","tone":"1"}'

# --- POST /api/prompt ---
res=$(curl -s -w "\n%{http_code}" -H "Content-Type: application/json" -d "$FILLED" "$BASE_URL/api/prompt")
status=$(echo "$res" | tail -n 1)
prompt=$(echo "$res" | sed '$d' | jq -r .prompt)
assert_eq "POST /api/prompt status" "200" "$status"
assert_eq "POST /api/prompt 変数" "1" "$(echo "$prompt" | grep -c '^- 紹介したい商品・サービス：{\$1 クレンジング}$')"
assert_eq "POST /api/prompt 口調" "1" "$(echo "$prompt" | grep -c '口調は「{親しみやすいお姉さん系}」を厳守')"
assert_eq "POST /api/prompt 口調の変数" "1" "$(echo "$prompt" | grep -c '^- 口調：{親しみやすいお姉さん系}$')"
assert_eq "POST /api/prompt 口調パターンの指示" "1" "$(echo "$prompt" | grep -c '^## 口調パターン（1. 親しみやすいお姉さん系）$')"
assert_eq "POST /api/prompt 口調パターンは出力形式の前" "1" "$(echo "$prompt" | awk '/^## 口調パターン/{p=NR} /^## 出力形式/{o=NR} END{print (p && o && p<o) ? 1 : 0}')"
assert_eq "POST /api/prompt {} が残らない" "0" "$(echo "$prompt" | grep -c '{ジャンル}\|{口調}')"

prompt=$(curl -s -H "Content-Type: application/json" -d '{"genre":"{美容}","target":"a","product":"b","tone":"10"}' "$BASE_URL/api/prompt" | jq -r .prompt)
assert_eq "POST /api/prompt {} を二重にしない" "1" "$(echo "$prompt" | grep -c '^- ジャンル：{美容}$')"

res=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d '{"genre":"ジャンル","target":"a","product":"b","tone":"1"}' "$BASE_URL/api/prompt")
assert_eq "POST /api/prompt 初期文字のまま → 400" "400" "$res"

res=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d '{"genre":"a","target":"a","product":"b","tone":"女子のタメ口"}' "$BASE_URL/api/prompt")
assert_eq "POST /api/prompt 10パターン以外の口調 → 400" "400" "$res"

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

# --- この Mac からだけ開ける（127.0.0.1 で待ち受け） ---
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "$LAN_IP" ]; then
  res=$(curl -s -o /dev/null -m 3 -w "%{http_code}" "http://$LAN_IP:3002/")
  assert_eq "LAN のアドレスからはつながらない" "000" "$res"
fi

echo ""
echo "結果: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
