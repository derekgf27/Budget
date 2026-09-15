import { describe, expect, it } from "vitest";
import {
  getSundayAfterPaydayReminders,
  sundayAfterPayday,
} from "./checkin-email";

describe("sundayAfterPayday", () => {
  it("maps Friday payday to that Sunday", () => {
    expect(sundayAfterPayday("2026-09-11")).toBe("2026-09-13"); // Fri → Sun
  });

  it("maps Thursday payday to that Sunday", () => {
    expect(sundayAfterPayday("2026-09-10")).toBe("2026-09-13");
  });

  it("maps Sunday payday to the next Sunday", () => {
    expect(sundayAfterPayday("2026-09-13")).toBe("2026-09-20");
  });
});

describe("getSundayAfterPaydayReminders", () => {
  it("returns job when today is Sunday after last payday", () => {
    // Last payday Fri Sep 11; next scheduled Fri Sep 25; today Sun Sep 13
    const rows = getSundayAfterPaydayReminders(
      [
        {
          id: "job1",
          name: "Ciracet",
          nextPayday: "2026-09-25",
          cadence: "biweekly",
        },
      ],
      new Date(2026, 8, 13),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].payday).toBe("2026-09-11");
    expect(rows[0].sunday).toBe("2026-09-13");
  });

  it("returns nothing mid-week", () => {
    const rows = getSundayAfterPaydayReminders(
      [
        {
          id: "job1",
          name: "Ciracet",
          nextPayday: "2026-09-25",
          cadence: "biweekly",
        },
      ],
      new Date(2026, 8, 12), // Saturday
    );
    expect(rows).toHaveLength(0);
  });
});
