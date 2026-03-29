/**
 * Format a date as DD/MM/YYYY with English numerals.
 * Works correctly in RTL context without reversal artifacts.
 */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const day   = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year  = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a monetary value with ر.س suffix and Arabic-friendly number formatting.
 */
export function fmtMoney(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${num.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
}

/**
 * Format a date with full Arabic month name + weekday, but English numerals for day/year.
 * e.g. "الأربعاء، 25 مارس 2026"
 */
export function fmtDateFull(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * Format a Gregorian date as Hijri (Umm al-Qura) DD/MM/YYYY using Arabic numerals.
 * Dates are stored as Gregorian in DB; this is display-only conversion.
 * e.g. "١٥/٠٩/١٤٤٦"
 */
export function fmtHijri(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/**
 * Format a Gregorian date as full Hijri (Umm al-Qura) with weekday and month name.
 * e.g. "الأربعاء، ١٥ رمضان ١٤٤٦"
 */
export function fmtHijriFull(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * Format a Gregorian date as short Hijri label (day + month name + year).
 * e.g. "١٥ رمضان ١٤٤٦"
 */
export function fmtHijriShort(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    year: "numeric", month: "long", day: "numeric",
  });
}
