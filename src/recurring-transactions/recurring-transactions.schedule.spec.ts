import { BadRequestException } from "@nestjs/common";
import { calculateNextRunDate } from "./recurring-transactions.schedule";

describe("calculateNextRunDate", () => {
  it("calculates daily, weekly, and monthly next run dates from start date and interval", () => {
    expect(calculateNextRunDate("2026-01-01T00:00:00.000Z", "daily", 2)).toBe("2026-01-03T00:00:00.000Z");
    expect(calculateNextRunDate("2026-01-01T00:00:00.000Z", "weekly", 2)).toBe("2026-01-15T00:00:00.000Z");
    expect(calculateNextRunDate("2026-01-31T00:00:00.000Z", "monthly", 1)).toBe("2026-02-28T00:00:00.000Z");
  });

  it("rejects invalid intervals", () => {
    expect(() => calculateNextRunDate("2026-01-01T00:00:00.000Z", "daily", 0)).toThrow(BadRequestException);
  });
});
