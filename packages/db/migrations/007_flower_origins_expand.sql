-- ============================================================
-- Migration 007: Expand flower_origin enum — بيانات حقيقية شاملة
-- Run: PGPASSWORD=Nasaq_DB_2026@secure psql -h 127.0.0.1 -U nasaq_user -d nasaq -f 007_flower_origins_expand.sql
-- ============================================================

-- أفريقيا
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'zimbabwe';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'tanzania';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'south_africa';

-- أمريكا اللاتينية
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'brazil';

-- أوروبا
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'france';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'spain';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'italy';

-- الشرق الأوسط
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'israel';

-- آسيا
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'thailand';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'malaysia';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'vietnam';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'indonesia';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'australia';

-- محلي الخليج
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'local_kuwait';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'local_bahrain';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'local_qatar';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'local_oman';
