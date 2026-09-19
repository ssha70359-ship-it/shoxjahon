#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Uchdan-uchgacha test: server ko'tariladi, to'lov protokollari sinaladi.
#
#  DIQQAT: test bazadagi Order/Transaction jadvallariga yozadi.
#  Faqat TEST bazasida ishlating, ishchi (production) bazada EMAS.
#
#  Ishga tushirish:
#    DATABASE_URL="postgresql://.../lms_test" ./tests/run.sh
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL kerak (test bazasi manzili)}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

# Testlar kutadigan sozlamalar
export BOT_TOKEN="${BOT_TOKEN:-123456:FAKE_TOKEN_FOR_TEST}"
export PAYME_MERCHANT_ID="${PAYME_MERCHANT_ID:-merchant_test_id}"
export PAYME_KEY="${PAYME_KEY:-test_payme_key_123}"
export CLICK_SERVICE_ID="${CLICK_SERVICE_ID:-11111}"
export CLICK_MERCHANT_ID="${CLICK_MERCHANT_ID:-22222}"
export CLICK_SECRET_KEY="${CLICK_SECRET_KEY:-click_secret_456}"
export NODE_ENV=development

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

start_server() {
  PORT="$1" ALLOW_DEV_USER="$2" node src/index.js >/tmp/lms-test-server.log 2>&1 &
  SERVER_PID=$!

  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://127.0.0.1:$1/api/health" && return 0
    sleep 0.5
  done

  echo "❌ Server ishga tushmadi:"; cat /tmp/lms-test-server.log; exit 1
}

echo "▶ Baza tayyorlanmoqda..."
npx prisma migrate deploy >/dev/null 2>&1
node prisma/seed.js

echo "▶ To'lov oqimi testlari (ALLOW_DEV_USER=true)"
start_server 5099 true
TEST_BASE_URL="http://127.0.0.1:5099" node tests/payments.e2e.mjs
cleanup; SERVER_PID=""

echo "▶ Avtorizatsiya testlari (ALLOW_DEV_USER=false)"
start_server 5098 false
TEST_BASE_URL="http://127.0.0.1:5098" node tests/auth.e2e.mjs
cleanup; SERVER_PID=""

echo "✅ Barcha testlar o'tdi"
