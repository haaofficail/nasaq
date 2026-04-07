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
set -e

SSH_KEY="${SSH_KEY:-~/.ssh/nasaq_deploy}"
SERVER="root@187.124.41.239"

echo "→ دفع الكود إلى GitHub..."
git push github HEAD:main

echo "→ نشر على السيرفر..."
ssh -i "$SSH_KEY" "$SERVER" "bash /var/www/nasaq/deploy.sh"
