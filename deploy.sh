#!/bin/bash
# =============================================================
# نسق — نشر التحديثات على السيرفر
# الاستخدام: bash deploy.sh
# =============================================================
set -e

SERVER="root@187.124.41.239"
SSH_KEY="$HOME/.ssh/nasaq_deploy"
REMOTE="/var/www/nasaq"

echo "🚀 نشر التحديثات..."

# 1. نسخ ملفات الـ API
echo "→ نسخ API..."
scp -i "$SSH_KEY" packages/api/src/routes/*.ts        "$SERVER:$REMOTE/packages/api/src/routes/"
scp -i "$SSH_KEY" packages/api/src/index.ts           "$SERVER:$REMOTE/packages/api/src/"
scp -i "$SSH_KEY" packages/api/src/lib/*.ts            "$SERVER:$REMOTE/packages/api/src/lib/" 2>/dev/null || true
scp -i "$SSH_KEY" packages/api/src/middleware/*.ts     "$SERVER:$REMOTE/packages/api/src/middleware/" 2>/dev/null || true
scp -i "$SSH_KEY" packages/db/schema/*.ts              "$SERVER:$REMOTE/packages/db/schema/"

# 2. نسخ ملفات الـ Dashboard
echo "→ نسخ Dashboard..."
rsync -avz -e "ssh -i $SSH_KEY" \
  --exclude=node_modules --exclude=dist --exclude=".git" \
  apps/dashboard/src/ "$SERVER:$REMOTE/apps/dashboard/src/"

# 3. إعادة تشغيل الـ API
echo "→ إعادة تشغيل API..."
ssh -i "$SSH_KEY" "$SERVER" "source ~/.nvm/nvm.sh && pm2 restart nasaq-api"

# 4. بناء الـ Dashboard
echo "→ بناء Dashboard..."
ssh -i "$SSH_KEY" "$SERVER" "source ~/.nvm/nvm.sh && cd $REMOTE/apps/dashboard && npx vite build 2>&1 | tail -5"

echo "✅ تم النشر بنجاح!"
