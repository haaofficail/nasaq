-- 118: دعم OTP عبر الإيميل
-- إضافة عمود email وجعل phone اختيارياً

ALTER TABLE otp_codes ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes (email);
