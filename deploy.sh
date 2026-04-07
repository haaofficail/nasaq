#!/bin/bash
# =============================================================
# نسق — سكربت النشر الرسمي على السيرفر
# التشغيل (على السيرفر):
#   bash /var/www/nasaq/deploy.sh
# =============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nasaq}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

echo "→ جلب أحدث نسخة من GitHub (${BRANCH})..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "→ تثبيت الاعتمادات (pnpm)..."
pnpm install --frozen-lockfile

echo "→ إعادة تشغيل الخدمة..."
pm2 restart all --update-env

echo "✅ تم النشر بنجاح"
