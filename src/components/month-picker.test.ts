import { describe, expect, it } from "vitest";
import { dateFromMonthKey } from "./month-picker";

describe("dateFromMonthKey", () => {
  it("uses today's day for the current month", () => {
    const today = new Date(2026, 8, 25);
    const d = dateFromMonthKey("2026-09", today);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);
  });

  it("uses the last day of a past month", () => {
    const today = new Date(2026, 8, 25);
    const d = dateFromMonthKey("2026-08", today);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
  });
});
