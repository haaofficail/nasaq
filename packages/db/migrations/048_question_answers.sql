-- Migration 048: expand question_type enum + add question_answers to bookings

-- Expand enum to match all types used in ServiceFormPage
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'textarea';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'multi';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'location';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'file';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'image';

-- Store question answers on the booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_answers jsonb DEFAULT '[]';
