import { describe, expect, it } from "vitest";
import { generateRecurringDates } from "../lib/booking-engine";

describe("generateRecurringDates", () => {
  it("clamps monthly recurrences at month end instead of skipping into the following month", () => {
    const dates = generateRecurringDates(
      new Date("2026-01-31T10:00:00.000Z"),
      {
        frequency: "monthly",
        endDate: "2026-03-31T23:59:59.000Z",
      },
    );

    expect(dates.map((date) => date.toISOString())).toEqual([
      "2026-02-28T10:00:00.000Z",
      "2026-03-28T10:00:00.000Z",
    ]);
  });
});
