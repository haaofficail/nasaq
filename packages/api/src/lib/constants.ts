// ============================================================
// CONSTANTS — مصدر الحقيقة الواحد لجميع الثوابت
// ============================================================

// Auth / Session
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5; // lockout after 5 consecutive failures

// Business defaults (overridden per-org from settings)
export const DEFAULT_VAT_RATE = 15; // 15% Saudi VAT
export const DEFAULT_DEPOSIT_PERCENT = 30;
export const REFERRAL_REWARD_PERCENT = 5;

// Trial
export const DEFAULT_TRIAL_DAYS = 14;

// Scheduler intervals
export const SEGMENT_REFRESH_INTERVAL_MS = 60 * 60 * 1000;    // 1 hour
export const AUTO_CANCEL_INTERVAL_MS = 24 * 60 * 60 * 1000;   // 1 day
export const HEALTH_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;     // 5 minutes
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Booking
export const AUTO_CANCEL_OVERDUE_DAYS = 3;
export const BOOKING_TRACKING_TOKEN_LENGTH = 16;
export const FIND_AVAILABLE_DAYS_AHEAD = 30;
export const ASSET_BOOKING_THRESHOLD = 3;

// Pagination
export const PAGINATION_MAX_LIMIT = 100;
export const PAGINATION_DEFAULT_LIMIT = 20;

// Import limits
export const IMPORT_MAX_SERVICES = 500;
export const IMPORT_MAX_CUSTOMERS = 1000;

// Allowed sort fields (whitelist against injection)
export const SERVICE_SORT_FIELDS = [
  "sortOrder", "name", "createdAt", "updatedAt", "basePrice", "totalBookings",
] as const;
export type ServiceSortField = typeof SERVICE_SORT_FIELDS[number];

export const BOOKING_SORT_FIELDS = [
  "createdAt", "eventDate", "totalAmount", "updatedAt",
] as const;
export type BookingSortField = typeof BOOKING_SORT_FIELDS[number];
