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
