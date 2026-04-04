#!/bin/bash
# deploy.sh — نشر الداشبورد والـ API على السيرفر
set -e

SERVER="root@187.124.41.239"
SSH_KEY="~/.ssh/nasaq_deploy"
REMOTE="/var/www/nasaq"

echo "[1/4] رفع الداشبورد..."
rsync -az --delete apps/dashboard/dist/ $SERVER:$REMOTE/apps/dashboard/dist/ -e "ssh -i $SSH_KEY"

echo "[2/4] رفع الـ API..."
rsync -az packages/api/src/ $SERVER:$REMOTE/packages/api/src/ -e "ssh -i $SSH_KEY"

echo "[3/4] إصلاح الأذونات..."
ssh -i $SSH_KEY $SERVER "
  chown root:www-data $REMOTE $REMOTE/apps $REMOTE/apps/dashboard $REMOTE/apps/dashboard/dist
  chown -R root:www-data $REMOTE/apps/dashboard/dist/
  chmod 755 $REMOTE $REMOTE/apps $REMOTE/apps/dashboard $REMOTE/apps/dashboard/dist
  chmod -R 755 $REMOTE/apps/dashboard/dist/
"

echo "[4/4] إعادة تشغيل الـ API..."
ssh -i $SSH_KEY $SERVER "export PATH=\$PATH:/root/.nvm/versions/node/v20.20.1/bin && pm2 restart nasaq-api"

echo "تم النشر بنجاح"
