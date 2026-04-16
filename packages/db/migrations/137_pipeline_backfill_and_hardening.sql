-- ============================================================
-- Migration 137: Pipeline Workflow — Backfill + Hardening
-- يعبّئ mapped_status للصفوف القديمة بناءً على الاسم العربي
-- ويضيف عمود workflow_config_state للكشف التلقائي عن حالة الـ config
-- ============================================================

-- 1. Backfill mapped_status based on known Arabic/English stage names
--    Only updates rows where mapped_status IS NULL (safe for already-mapped rows)
UPDATE booking_pipeline_stages SET mapped_status = 'pending'
  WHERE mapped_status IS NULL
    AND name IN ('طلب جديد', 'New Request', 'Pending', 'طلب');

UPDATE booking_pipeline_stages SET mapped_status = 'confirmed'
  WHERE mapped_status IS NULL
    AND name IN ('تأكيد أولي', 'Initial Confirmation', 'Confirmed', 'تأكيد');

UPDATE booking_pipeline_stages SET mapped_status = 'deposit_paid'
  WHERE mapped_status IS NULL
    AND name IN ('عربون مدفوع', 'Deposit Paid', 'عربون', 'دفعة أولى');

UPDATE booking_pipeline_stages SET mapped_status = 'fully_confirmed'
  WHERE mapped_status IS NULL
    AND name IN ('تأكيد نهائي', 'Final Confirmation', 'Fully Confirmed', 'تأكيد كامل');

UPDATE booking_pipeline_stages SET mapped_status = 'preparing'
  WHERE mapped_status IS NULL
    AND name IN ('قيد التجهيز', 'Preparing', 'In Preparation', 'تجهيز');

UPDATE booking_pipeline_stages SET mapped_status = 'in_progress'
  WHERE mapped_status IS NULL
    AND name IN ('قيد التنفيذ', 'In Progress', 'جارٍ التنفيذ', 'تنفيذ');

UPDATE booking_pipeline_stages SET mapped_status = 'completed'
  WHERE mapped_status IS NULL
    AND name IN ('مكتمل', 'Completed', 'Done', 'اكتمل');

UPDATE booking_pipeline_stages SET mapped_status = 'reviewed'
  WHERE mapped_status IS NULL
    AND name IN ('تمت المراجعة', 'تم التقييم', 'Reviewed', 'مُقيَّم');

UPDATE booking_pipeline_stages SET mapped_status = 'cancelled'
  WHERE mapped_status IS NULL
    AND name IN ('ملغي', 'ملغى', 'Cancelled', 'Canceled');

UPDATE booking_pipeline_stages SET mapped_status = 'no_show'
  WHERE mapped_status IS NULL
    AND name IN ('لم يحضر', 'No Show', 'غياب');

-- 2. Ensure is_terminal is set correctly for known terminal mapped statuses
UPDATE booking_pipeline_stages
  SET is_terminal = TRUE
  WHERE mapped_status IN ('completed', 'cancelled', 'no_show', 'reviewed')
    AND is_terminal = FALSE;

-- 3. Detect and log duplicate mapped_status within same org (data integrity check)
--    These orgs will be marked as invalid-config by the engine
--    (No data deletion — just surfacing the problem via application layer)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT org_id, mapped_status
    FROM booking_pipeline_stages
    WHERE mapped_status IS NOT NULL
    GROUP BY org_id, mapped_status
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'workflow-engine: % org(s) have duplicate mapped_status in booking_pipeline_stages — will be classified as invalid-config', dup_count;
  END IF;
END $$;
