-- Migration 150: page_templates — قوالب صفحات Page Builder v2
-- ============================================================
CREATE TABLE IF NOT EXISTS page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  description_ar TEXT,
  category VARCHAR(50) NOT NULL,
  business_types TEXT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL,
  preview_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON page_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON page_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_templates_published ON page_templates(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_templates_sort ON page_templates(sort_order, created_at);
