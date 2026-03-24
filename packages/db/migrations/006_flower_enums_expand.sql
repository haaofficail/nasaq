-- ============================================================
-- Migration 006: Expand Flower Enums
-- Run: PGPASSWORD=Nasaq_DB_2026@secure psql -h 127.0.0.1 -U nasaq_user -d nasaq -f 006_flower_enums_expand.sql
-- ============================================================

-- ─── flower_type: 20 أنواع إضافية ────────────────────────────────────────────
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'dahlia';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'freesia';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'iris';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'lisianthus';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'anthurium';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'statice';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'ranunculus';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'delphinium';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'anemone';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'alstroemeria';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'snapdragon';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'narcissus';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'jasmine';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'gardenia';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'protea';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'calla_lily';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'gerbera';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'matthiola';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'waxflower';
ALTER TYPE flower_type ADD VALUE IF NOT EXISTS 'bird_of_paradise';

-- ─── flower_color: 5 ألوان إضافية ────────────────────────────────────────────
ALTER TYPE flower_color ADD VALUE IF NOT EXISTS 'blue';
ALTER TYPE flower_color ADD VALUE IF NOT EXISTS 'green';
ALTER TYPE flower_color ADD VALUE IF NOT EXISTS 'champagne';
ALTER TYPE flower_color ADD VALUE IF NOT EXISTS 'black';
ALTER TYPE flower_color ADD VALUE IF NOT EXISTS 'silver';

-- ─── flower_origin: 3 منشآت إضافية ──────────────────────────────────────────
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'japan';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'india';
ALTER TYPE flower_origin ADD VALUE IF NOT EXISTS 'china';
