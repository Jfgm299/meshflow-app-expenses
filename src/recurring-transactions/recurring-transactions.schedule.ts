import { BadRequestException } from "@nestjs/common";
import { RECURRING_TRANSACTION_FREQUENCIES, type RecurringTransactionFrequency } from "./recurring-transactions.types";

const DEFAULT_INTERVAL = 1;

const getValidDate = (dateText: string, fieldName: string): Date => {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Recurring transaction ${fieldName} must be a valid date`);
  }

  return date;
};

const addMonthsClamped = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
};

export const calculateNextRunDate = (startDate: string, frequency: RecurringTransactionFrequency, interval: number = DEFAULT_INTERVAL): string => {
  const date = getValidDate(startDate, "startDate");

  if (!Number.isInteger(interval) || interval < 1) {
    throw new BadRequestException("Recurring transaction interval must be a positive integer");
  }

  if (frequency === RECURRING_TRANSACTION_FREQUENCIES.DAILY) {
    date.setUTCDate(date.getUTCDate() + interval);
    return date.toISOString();
  }

  if (frequency === RECURRING_TRANSACTION_FREQUENCIES.WEEKLY) {
    date.setUTCDate(date.getUTCDate() + interval * 7);
    return date.toISOString();
  }

  if (frequency === RECURRING_TRANSACTION_FREQUENCIES.MONTHLY) {
    return addMonthsClamped(date, interval).toISOString();
  }

  throw new BadRequestException("Recurring transaction frequency must be daily, weekly, or monthly");
};
