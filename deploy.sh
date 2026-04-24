#!/bin/bash
# =============================================================
# ترميز OS — سكربت النشر الرسمي
# التشغيل (على السيرفر):
#   bash /var/www/nasaq/deploy.sh
# =============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nasaq}"
BRANCH="${BRANCH:-main}"
API_PORT="${API_PORT:-3000}"
HEALTH_PATH="${HEALTH_PATH:-/api/v1/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-15}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"

cd "$APP_DIR"

# ─── سجل الـ commit الحالي للـ rollback ──────────────────────
PREV_COMMIT=$(git rev-parse HEAD)
echo "→ الإصدار الحالي: ${PREV_COMMIT:0:8}"

rollback() {
  echo ""
  echo "✗ فشل النشر — جارٍ الرجوع إلى ${PREV_COMMIT:0:8}..."
  git checkout "$PREV_COMMIT" -- .
  pnpm install --frozen-lockfile --silent
  pm2 startOrReload ecosystem.config.cjs --update-env --silent
  echo "↩ تم الرجوع إلى الإصدار السابق"
  exit 1
}
trap rollback ERR

# ─── 1. جلب الكود ────────────────────────────────────────────
echo "→ جلب أحدث نسخة من GitHub (${BRANCH})..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
NEW_COMMIT=$(git rev-parse HEAD)
echo "→ الإصدار الجديد: ${NEW_COMMIT:0:8}"

# ─── 2. تثبيت الاعتمادات ─────────────────────────────────────
echo "→ تثبيت الاعتمادات..."
pnpm install --frozen-lockfile

# ─── 3. TypeScript check ─────────────────────────────────────
echo "→ فحص TypeScript..."
pnpm --filter @nasaq/api exec tsc --noEmit || {
  echo "✗ TypeScript errors — تم إلغاء النشر"
  rollback
}

# ─── 4. تشغيل الـ migrations ─────────────────────────────────
echo "→ تشغيل migrations..."
pnpm --filter @nasaq/db migrate 2>&1 || {
  echo "✗ Migrations فشلت — تم إلغاء النشر"
  rollback
}

# ─── 5. إعادة تشغيل الخدمة ───────────────────────────────────
echo "→ إعادة تشغيل الخدمة..."
pm2 startOrReload ecosystem.config.cjs --update-env

# ─── 6. Health check ─────────────────────────────────────────
echo "→ فحص صحة الخدمة (${HEALTH_RETRIES} محاولة)..."
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "http://localhost:${API_PORT}${HEALTH_PATH}" > /dev/null 2>&1; then
    echo "✅ الخدمة تعمل — النشر مكتمل (${NEW_COMMIT:0:8})"
    exit 0
  fi
  echo "   محاولة ${i}/${HEALTH_RETRIES}..."
  sleep "$HEALTH_INTERVAL"
done

echo "✗ الخدمة لم تستجب بعد ${HEALTH_RETRIES} محاولة"
rollback
