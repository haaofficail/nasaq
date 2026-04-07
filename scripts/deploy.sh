#!/bin/bash
# deploy.sh — مسار النشر الرسمي الموحّد
# المسار الرسمي: git push إلى GitHub ثم deploy.sh على السيرفر يسحب منه
#
# طريقة الاستخدام:
#   git push github main
#   ssh -i ~/.ssh/nasaq_deploy root@187.124.41.239 "bash /var/www/nasaq/deploy.sh"
#
# أو مباشرة من المحلي (يدفع ثم ينشر دفعة واحدة):
#   bash scripts/deploy.sh
#
set -euo pipefail

SSH_KEY="${SSH_KEY:-~/.ssh/nasaq_deploy}"
SERVER="root@187.124.41.239"
REMOTE_NAME="${REMOTE_NAME:-github}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

echo "→ دفع الكود إلى GitHub (${REMOTE_NAME}/${TARGET_BRANCH})..."
git push "$REMOTE_NAME" "HEAD:${TARGET_BRANCH}"

echo "→ نشر على السيرفر..."
ssh -i "$SSH_KEY" "$SERVER" "bash /var/www/nasaq/deploy.sh"
